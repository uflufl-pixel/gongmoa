import { and, eq } from 'drizzle-orm';
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

async function upsertCollected(items:IncomingNotice[]) {
  const db=getDb(); const now=new Date();
  const summary={discovered:items.length,inserted:0,updated:0,unchanged:0,review:0};
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
  const sourceItems=await db.select({id:sources.id,url:sources.url,name:sources.name}).from(sources);
  const inspected=await Promise.all(sourceItems.map(inspectSource));
  for(const result of inspected) {
    await db.insert(sourceChecks).values(result.check);
    await db.update(sources).set({status:result.check.outcome==='success'?'connected':'attention',lastSuccessAt:result.check.outcome==='success'?result.check.finishedAt:undefined}).where(eq(sources.id,result.check.sourceId));
  }
  const incoming=[...parseBizinfo(inspected.find(x=>x.check.sourceId==='bizinfo')?.body||''),...parseMoe(inspected.find(x=>x.check.sourceId==='moe-board')?.body||'')];
  const collection=incoming.length>=2?await upsertCollected(incoming):{discovered:incoming.length,inserted:0,updated:0,unchanged:0,review:1};
  return {results:inspected.map(x=>x.check),collection};
}
