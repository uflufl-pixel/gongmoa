import { and, eq, lt } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from './index';
import { ensureSeeded } from './queries';
import { notices, revisions, sourceChecks, sources } from './schema';

const decoder=(value:string)=>value.replace(/<[^>]+>/g,' ').replace(/&#(x?[0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10))).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&middot;/g,'·').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();

async function sha256(value:string) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}

async function inspectSource(source:{id:string;url:string;name:string}) {
  const startedAt=new Date();
  try {
    const fetchUrl=source.id==='bojo'?'https://www.bojo.go.kr/':source.url;
    const response=await fetch(fetchUrl,{headers:{accept:'text/html,application/xhtml+xml,application/json','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'},signal:AbortSignal.timeout(12000),redirect:'follow'});
    const body=await response.text();
    const sample=body.slice(0,1_000_000);
    const titleMatch=sample.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const keywordHits=(sample.match(/공모|지원사업|사업공고|모집/g)||[]).length;
    const usable=response.ok&&(body.length>5000||keywordHits>0);
    return {check:{id:crypto.randomUUID(),sourceId:source.id,outcome:usable?'success':response.ok?'content_error':'http_error',statusCode:response.status,contentHash:await sha256(sample),contentBytes:new TextEncoder().encode(body).byteLength,keywordHits,pageTitle:titleMatch?decoder(titleMatch[1]).slice(0,200):source.name,message:usable?null:response.ok?'응답 본문 확인 필요':`HTTP ${response.status}`,startedAt,finishedAt:new Date()},body:usable?body:null};
  } catch(error) {
    return {check:{id:crypto.randomUUID(),sourceId:source.id,outcome:'fetch_error',statusCode:null,contentHash:null,contentBytes:null,keywordHits:null,pageTitle:source.name,message:error instanceof Error?error.message.slice(0,300):'Fetch failed',startedAt,finishedAt:new Date()},body:null};
  }
}

type IncomingNotice={sourceId:string;externalId:string;institution:string;group:string;title:string;category:string;audience:string;region:string|null;sourceName:string;sourceUrl:string;opensAt:Date|null;closesAt:Date|null;deadlineLabel:string;status:string};

type BojoItem=Record<string,string|undefined>;
const cdata=(value?:string)=>decoder((value||'').replace(/^<!\[CDATA\[/,'').replace(/\]\]>$/,''));

function dateAtSeoul(value:string,end=false) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T${end?'23:59:59':'00:00:00'}+09:00`);
}

function parseBizinfo(html:string):IncomingNotice[] {
  const rows=html.match(/<tr>[\s\S]*?<\/tr>/gi)||[];
  return rows.flatMap(row=>{
    const id=row.match(/pblancId=(PBLN_[0-9]+)/i)?.[1];
    const title=row.match(/<a[^>]+pblancId=[^>]+title="([\s\S]*?)\s+페이지 이동"/i)?.[1];
    if(!id||!title) return [];
    const cells=Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi),m=>decoder(m[1]));
    if(cells.length<7) return [];
    const period=cells[3]; const dates=period.match(/\d{4}-\d{2}-\d{2}/g)||[];
    const detail=`https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=${id}`;
    return [{sourceId:'bizinfo',externalId:id,institution:cells[4]||'중소벤처기업부',group:/광역시|특별시|특별자치|[가-힣]+도$/.test(cells[4])?'지방자치단체':'중앙부처',title:decoder(title),category:cells[1]||'지원사업',audience:'기업·소상공인',region:/^\[([^\]]+)\]/.exec(decoder(title))?.[1]||null,sourceName:'기업마당',sourceUrl:detail,opensAt:dates[0]?dateAtSeoul(dates[0]):null,closesAt:dates[1]?dateAtSeoul(dates[1],true):null,deadlineLabel:period||'공고문 확인',status:'open'}];
  }).slice(0,20);
}

function parseMoe(html:string):IncomingNotice[] {
  const rows=html.match(/<tr>[\s\S]*?<\/tr>/gi)||[];
  return rows.flatMap(row=>{
    const match=row.match(/goView\('72761',\s*'([0-9]+)'[\s\S]*?title="([\s\S]*?)"/i);
    if(!match) return [];
    const title=decoder(match[2]);
    if(!/(공모|모집|지원|사업|선정|인증)/.test(title)||/(공시송달|현황 공개)/.test(title)) return [];
    const cells=Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi),m=>decoder(m[1]));
    const detail=`https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=72761&boardSeq=${match[1]}&lev=0&statusYN=W&page=1&s=moe&m=020502&opType=N`;
    return [{sourceId:'moe-board',externalId:match[1],institution:'교육부',group:'중앙부처',title,category:'교육',audience:'기관·단체',region:null,sourceName:'교육부 사업공고',sourceUrl:detail,opensAt:cells[3]?dateAtSeoul(cells[3]):null,closesAt:null,deadlineLabel:'공고문 확인',status:'open'}];
  }).slice(0,20);
}

async function collectBojoApi() {
  const key=env.BOJO_API_KEY;
  if(!key) return null;
  const kstNow=new Date(Date.now()+9*60*60*1000); const today=kstNow.toISOString().slice(0,10).replaceAll('-','');
  // Daily runs only need today and yesterday; keeping this window narrow avoids
  // slow provider fan-out while still covering delayed updates around midnight.
  const dates=Array.from({length:2},(_,i)=>{const date=new Date(kstNow);date.setUTCDate(date.getUTCDate()-i);return date.toISOString().slice(0,10).replaceAll('-','')});
  const responses=await Promise.all(dates.map(async date=>{
    const url=`https://apis.data.go.kr/1051000/MoefOpenAPI2025/T_OPD_ASBS_PBNS_UNITY?serviceKey=${key}&pageNo=1&numOfRows=100&resultType=json&bsnsyear=${kstNow.getUTCFullYear()}&pblanc_updt_dt=${date}`;
    const response=await fetch(url,{headers:{accept:'application/json','user-agent':'GongmoaCollector/1.0'},signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error(`기획예산처 API HTTP ${response.status}`);
    const payload=await response.json() as {response?:{header?:{resultCode?:string;resultMsg?:string};body?:{items?:{item?:BojoItem|BojoItem[]}}}};
    if(payload.response?.header?.resultCode!=='00') throw new Error(payload.response?.header?.resultMsg||'기획예산처 API 오류');
    const raw=payload.response?.body?.items?.item; return raw?(Array.isArray(raw)?raw:[raw]):[];
  }));
  const seen=new Set<string>(); const items:IncomingNotice[]=[];
  for(const item of responses.flat()) {
    const title=cdata(item.PBLANC_NM); const closes=cdata(item.RCEPT_END_DE)||cdata(item.PBLANC_END_DE);
    if(!title||(/^\d{8}$/.test(closes)&&closes<today)) continue;
    const popup=cdata(item.PBLANC_POPUP_URL)||cdata(item.BSNS_POPUP_URL)||'https://www.bojo.go.kr/bojo.do';
    const externalId=/nttId=([^&]+)/.exec(popup)?.[1]||`${cdata(item.DDTLBZ_ID)}-${cdata(item.PBLANC_BEGIN_DE)}`;
    if(!externalId||seen.has(externalId)) continue; seen.add(externalId);
    const institution=cdata(item.DLVPL_NM)||cdata(item.JRSD_NM)||'기획예산처'; const region=cdata(item.CTPRVN_NM)||null;
    const opens=cdata(item.RCEPT_BEGIN_DE)||cdata(item.PBLANC_BEGIN_DE);
    const compactDate=(value:string)=>/^\d{8}$/.test(value)?`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`:'';
    const openDate=compactDate(opens); const closeDate=compactDate(closes);
    items.push({sourceId:'bojo',externalId,institution,group:/(특별시|광역시|특별자치|[가-힣]+도|시|군|구)$/.test(institution)?'지방자치단체':'중앙부처',title,category:'보조금',audience:(cdata(item.SPORT_TRGET_CN)||cdata(item.SPORT_CN_DC)||'기관·단체').slice(0,100),region,sourceName:'보조금통합포털 API',sourceUrl:popup,opensAt:openDate?dateAtSeoul(openDate):null,closesAt:closeDate?dateAtSeoul(closeDate,true):null,deadlineLabel:closeDate?closeDate.replaceAll('-','.'):'공고문 확인',status:'open'});
  }
  return items;
}

async function upsertCollected(items:IncomingNotice[]) {
  const db=getDb(); const now=new Date();
  const summary={discovered:items.length,inserted:0,updated:0,unchanged:0,review:0,closed:0};
  for(const item of items) {
    const contentHash=await sha256(JSON.stringify(item));
    const existing=(await db.select().from(notices).where(and(eq(notices.sourceId,item.sourceId),eq(notices.externalId,item.externalId))).limit(1))[0];
    if(!existing) {
      await db.insert(notices).values({...item,id:`${item.sourceId}-${item.externalId.toLowerCase()}`,summary:null,applicationUrl:null,contentHash,verifiedAt:now,createdAt:now,updatedAt:now});
      summary.inserted++; continue;
    }
    if(existing.contentHash===contentHash) { await db.update(notices).set({verifiedAt:now}).where(eq(notices.id,existing.id)); summary.unchanged++; continue; }
    const changedFields=['institution','group','title','category','audience','region','sourceUrl','deadlineLabel','status'].filter(key=>existing[key as keyof typeof existing]!==item[key as keyof IncomingNotice]);
    if(existing.opensAt?.getTime()!==item.opensAt?.getTime()) changedFields.push('opensAt');
    if(existing.closesAt?.getTime()!==item.closesAt?.getTime()) changedFields.push('closesAt');
    await db.insert(revisions).values({noticeId:existing.id,contentHash,changedFields:JSON.stringify(changedFields),discoveredAt:now});
    await db.update(notices).set({...item,contentHash,verifiedAt:now,updatedAt:now}).where(eq(notices.id,existing.id)); summary.updated++;
  }
  return summary;
}

export async function syncOfficialSources() {
  await ensureSeeded();
  const db=getDb();
  const expired=await db.select({id:notices.id}).from(notices).where(and(eq(notices.status,'open'),lt(notices.closesAt,new Date())));
  if(expired.length) await db.update(notices).set({status:'closed',updatedAt:new Date()}).where(and(eq(notices.status,'open'),lt(notices.closesAt,new Date())));
  const sourceItems=await db.select({id:sources.id,url:sources.url,name:sources.name}).from(sources);
  const [inspected,bojoItems]=await Promise.all([Promise.all(sourceItems.map(inspectSource)),collectBojoApi()]);
  if(bojoItems) {
    const apiCheck=inspected.find(x=>x.check.sourceId==='bojo');
    if(apiCheck) Object.assign(apiCheck.check,{outcome:'success',statusCode:200,keywordHits:bojoItems.length,pageTitle:'기획예산처 국고보조금 공모사업 API',message:null,finishedAt:new Date()});
  }
  for(const result of inspected) {
    await db.insert(sourceChecks).values(result.check);
    await db.update(sources).set({status:result.check.outcome==='success'?'connected':'attention',lastSuccessAt:result.check.outcome==='success'?result.check.finishedAt:undefined}).where(eq(sources.id,result.check.sourceId));
  }
  const incoming=[...parseBizinfo(inspected.find(x=>x.check.sourceId==='bizinfo')?.body||''),...parseMoe(inspected.find(x=>x.check.sourceId==='moe-board')?.body||''),...(bojoItems||[])];
  const collection=incoming.length>=2?await upsertCollected(incoming):{discovered:incoming.length,inserted:0,updated:0,unchanged:0,review:1,closed:0};
  collection.closed=expired.length;
  return {results:inspected.map(x=>x.check),collection};
}
