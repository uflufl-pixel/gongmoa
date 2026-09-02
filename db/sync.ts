import { and, eq, lt } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from './index';
import { ensureSeeded } from './queries';
import { notices, revisions, sourceChecks, sources } from './schema';
import { bojoDate, unpackBojoPage } from '../lib/bojo-page';
import { applicationPeriod } from '../lib/application-period';

export const SYNC_BATCHES = [
  ['bojo','bizinfo','moe-board','gov24-orgs'],
  ['mcst-board','mois-board','me-board','kocca-support'],
  ['seoul-board','busan-board','incheon-board','daejeon-board','daegu-board'],
  ['ulsan-board','jeonbuk-board','gyeongnam-business','chungbuk-board','jeju-board'],
] as const;

const decoder=(value:string)=>value.replace(/<[^>]+>/g,' ').replace(/&#(x?[0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10))).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&middot;/g,'·').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();

async function sha256(value:string) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}

async function inspectSource(source:{id:string;url:string;name:string}) {
  const startedAt=new Date();
  try {
    const fetchUrl=source.id==='bojo'?'https://www.bojo.go.kr/':source.id==='kocca-support'?'https://www.kocca.kr/xml/rss/rss_pims.xml':source.url;
    const request=()=>fetch(fetchUrl,{headers:{accept:'text/html,application/xhtml+xml,application/json','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'},signal:AbortSignal.timeout(10000),redirect:'follow'});
    let response:Response;
    try { response=await request(); } catch { response=await request(); }
    if(response.status===408||response.status===429||response.status>=500) response=await request();
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

type IncomingNotice={sourceId:string;externalId:string;institution:string;group:string;title:string;category:string;audience:string;region:string|null;sourceName:string;sourceUrl:string;opensAt:Date|null;closesAt:Date|null;deadlineLabel:string;status:string;ministry?:string|null;businessYear?:number|null;announcedFrom?:string|null;announcedTo?:string|null;applicationFrom?:string|null;applicationTo?:string|null;supportBudget?:number|null;applicationMethod?:string|null};

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

const isGrantCandidate=(title:string)=>/(공모|모집|지원사업|지원대상|신규지원|선정 계획|참가신청)/.test(title)&&!/(채용|임원|상임이사|이사장|기관장|원장|본부장|강사|매니저|후보자|위원|참여단|공개검증|선정 결과|선정결과|심의결과|평가 결과|개찰결과|접수 마감|취소처분|입찰|의견수렴|공시송달)/.test(title);

function parseMcst(html:string):IncomingNotice[] {
  return (html.match(/<tr>[\s\S]*?<\/tr>/gi)||[]).flatMap(row=>{
    const match=row.match(/noticeView\.jsp\?pSeq=([0-9]+)[^>]*title="([^"]+)"/i); if(!match) return [];
    const title=decoder(match[2]); if(!isGrantCandidate(title)) return [];
    const posted=row.match(/aria-label="게시일">(\d{4}\.\d{2}\.\d{2})/)?.[1]?.replaceAll('.','-')||'';
    return [{sourceId:'mcst-board',externalId:match[1],institution:'문화체육관광부',group:'중앙부처',title,category:'문화·관광',audience:'기관·단체',region:null,sourceName:'문화체육관광부 공지',sourceUrl:`https://www.mcst.go.kr/site/s_notice/notice/noticeView.jsp?pSeq=${match[1]}`,opensAt:dateAtSeoul(posted),closesAt:null,deadlineLabel:'공고문 확인',status:'open'}];
  });
}

function parseMois(html:string):IncomingNotice[] {
  return (html.match(/<tr>[\s\S]*?<\/tr>/gi)||[]).flatMap(row=>{
    const match=row.match(/nttId=([0-9]+)[^>]*>([\s\S]*?)<\/a>/i); if(!match) return [];
    const title=decoder(match[2]); if(!isGrantCandidate(title)) return [];
    const posted=(row.match(/<td>(\d{4}\.\d{2}\.\d{2})\.<\/td>/)?.[1]||'').replaceAll('.','-');
    return [{sourceId:'mois-board',externalId:match[1],institution:'행정안전부',group:'중앙부처',title,category:'행정·안전',audience:'기관·단체',region:null,sourceName:'행정안전부 알립니다',sourceUrl:`https://www.mois.go.kr/frt/bbs/type013/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000006&nttId=${match[1]}`,opensAt:dateAtSeoul(posted),closesAt:null,deadlineLabel:'공고문 확인',status:'open'}];
  });
}

function parseMe(html:string):IncomingNotice[] {
  return (html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)||[]).flatMap(row=>{
    const match=row.match(/title="([^"]+)"[^>]+href="[^"]*boardId=([0-9]+)/i); if(!match) return [];
    const title=decoder(match[1]); if(!isGrantCandidate(title)) return [];
    const posted=row.match(/<td>\s*(\d{4}-\d{2}-\d{2})\s*<\/td>/)?.[1]||'';
    return [{sourceId:'me-board',externalId:match[2],institution:'기후에너지환경부',group:'중앙부처',title,category:'환경·에너지',audience:'기관·기업',region:null,sourceName:'기후에너지환경부 공지·공고',sourceUrl:`https://me.go.kr/home/web/board/read.do?boardMasterId=39&menuId=10524&boardId=${match[2]}`,opensAt:dateAtSeoul(posted),closesAt:null,deadlineLabel:'공고문 확인',status:'open'}];
  });
}

function parseSeoul(html:string):IncomingNotice[] {
  return (html.match(/<tr>[^]*?<\/tr>/gi)||[]).flatMap(row=>{
    const match=row.match(/fnTbbsView\('([0-9]+)'\);"[^>]*>([^]*?)<\/a>/i); if(!match) return [];
    const title=decoder(match[2]); if(!isGrantCandidate(title)) return [];
    const cells=Array.from(row.matchAll(/<td[^>]*>([^]*?)<\/td>/gi),m=>decoder(m[1]));
    const posted=cells.find(value=>/^\d{4}-\d{2}-\d{2}$/.test(value))||'';
    const dates=cells.filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)); const closes=dates[1]||'';
    return [{sourceId:'seoul-board',externalId:match[1],institution:'서울특별시',group:'지방자치단체',title,category:'지역·생활',audience:'시민·기관·단체',region:'서울',sourceName:'서울특별시 고시·공고',sourceUrl:`https://www.seoul.go.kr/news/news_notice.do?nttNo=${match[1]}&selmenu=M00000107`,opensAt:dateAtSeoul(posted),closesAt:dateAtSeoul(closes,true),deadlineLabel:closes?closes.replaceAll('-','.'):'공고문 확인',status:'open'}];
  });
}

function parseBusan(html:string):IncomingNotice[] {
  return (html.match(/<tr>[^]*?<\/tr>/gi)||[]).flatMap(row=>{
    const match=row.match(/\/nbgosi\/view\?sno=([0-9]+)&(?:amp;)?gosiGbn=([A-Z])[^>]*>([^]*?)<\/a>/i); if(!match) return [];
    const title=decoder(match[3]); if(!isGrantCandidate(title)) return [];
    const posted=(row.match(/\d{4}\.\d{2}\.\d{2}/)?.[0]||'').replaceAll('.','-');
    return [{sourceId:'busan-board',externalId:match[1],institution:'부산광역시',group:'지방자치단체',title,category:'지역·생활',audience:'시민·기관·단체',region:'부산',sourceName:'부산광역시 고시공고',sourceUrl:`https://www.busan.go.kr/nbgosi/view?sno=${match[1]}&gosiGbn=${match[2]}`,opensAt:dateAtSeoul(posted),closesAt:null,deadlineLabel:'공고문 확인',status:'open'}];
  });
}

function parseIncheon(html:string):IncomingNotice[] {
  return (html.match(/<tr>[^]*?<\/tr>/gi)||[]).flatMap(row=>{
    const match=row.match(/\/IC010307\/view\?sno=([0-9]+)&(?:amp;)?gosigbn=([A-Z])[^>]*>[^]*?<span class="subject">([^]*?)<\/span>/i); if(!match) return [];
    const title=decoder(match[3]); if(!isGrantCandidate(title)) return [];
    const posted=row.match(/\d{4}-\d{2}-\d{2}/)?.[0]||'';
    return [{sourceId:'incheon-board',externalId:match[1],institution:'인천광역시',group:'지방자치단체',title,category:'지역·생활',audience:'시민·기관·단체',region:'인천',sourceName:'인천광역시 고시공고',sourceUrl:`https://www.incheon.go.kr/IC010307/view?sno=${match[1]}&gosigbn=${match[2]}`,opensAt:dateAtSeoul(posted),closesAt:null,deadlineLabel:'공고문 확인',status:'open'}];
  });
}

function parseDaejeon(html:string):IncomingNotice[] {
  return (html.match(/<span class="thum">[^]*?<a href="\/online\/recruitmentNoticeDetail\.do\?compSeq=[^"]+"[^>]*>[^]*?<\/a>/gi)||[]).flatMap(card=>{
    const id=card.match(/recruitmentNoticeDetail\.do\?compSeq=([^"&]+)/i)?.[1];
    const title=decoder(card.match(/<strong class="thum_tit">([^]*?)<\/strong>/i)?.[1]||'');
    if(!id||!title||!isGrantCandidate(title)) return [];
    const period=decoder(card.match(/<em>접수기간<\/em>\s*<span>([^]*?)<\/span>/i)?.[1]||'');
    const range=applicationPeriod(period); const audience=decoder(card.match(/<em>참가대상<\/em>\s*<span>([^]*?)<\/span>/i)?.[1]||'시민·기관·단체');
    const closed=/type_end|종료/.test(card)||Boolean(range&&range.closesAt<new Date());
    return [{sourceId:'daejeon-board',externalId:decodeURIComponent(id),institution:'대전광역시',group:'지방자치단체',title,category:'지역·생활',audience:audience.slice(0,100),region:'대전',sourceName:'대전광역시 공모·모집',sourceUrl:`https://www.daejeon.go.kr/online/recruitmentNoticeDetail.do?compSeq=${encodeURIComponent(decodeURIComponent(id))}`,opensAt:range?.opensAt||null,closesAt:range?.closesAt||null,applicationFrom:range?.applicationFrom||null,applicationTo:range?.applicationTo||null,deadlineLabel:range?period:'공고문 확인',status:closed?'closed':'open'}];
  });
}

function parseDaegu(html:string):IncomingNotice[] {
  return (html.match(/<tr>[^]*?<\/tr>/gi)||[]).flatMap(row=>{
    const match=row.match(/gn_goRead\('([0-9]+)'\)[^>]*>([^]*?)<\/a>/i); if(!match) return [];
    const title=decoder(match[2]); if(!isGrantCandidate(title)) return [];
    const posted=row.match(/\d{4}-\d{2}-\d{2}/)?.[0]||''; const open=/접수중|접수전|공모등록/.test(decoder(row));
    return [{sourceId:'daegu-board',externalId:match[1],institution:'대구광역시',group:'지방자치단체',title,category:'지역·생활',audience:'시민·기관·단체',region:'대구',sourceName:'대구광역시 공모·모집',sourceUrl:`https://minwon.daegu.go.kr/pssrp/${match[1]}/view`,opensAt:dateAtSeoul(posted),closesAt:null,deadlineLabel:'공고문 확인',status:open?'open':'closed'}];
  });
}

function parseUlsan(html:string):IncomingNotice[] {
  return (html.match(/<tr>[^]*?<\/tr>/gi)||[]).flatMap(row=>{
    const match=row.match(/href="\.\/([0-9]+)\.ulsan\?[^\"]*gosiGbn=([A-Z])"[^>]*>([^]*?)<\/a>/i); if(!match) return [];
    const title=decoder(match[3]); if(!isGrantCandidate(title)) return [];
    const posted=row.match(/\d{4}-\d{2}-\d{2}/)?.[0]||'';
    return [{sourceId:'ulsan-board',externalId:match[1],institution:'울산광역시',group:'지방자치단체',title,category:'지역·생활',audience:'시민·기관·단체',region:'울산',sourceName:'울산광역시 고시공고',sourceUrl:`https://www.ulsan.go.kr/u/rep/transfer/notice/${match[1]}.ulsan?gosiGbn=${match[2]}&mId=001004002000000000`,opensAt:dateAtSeoul(posted),closesAt:null,deadlineLabel:'공고문 확인',status:'open'}];
  });
}

function parseJeonbuk(html:string):IncomingNotice[] {
  return (html.match(/<tr[^>]*>[^]*?<\/tr>/gi)||[]).flatMap(row=>{
    const match=row.match(/dataSid=([0-9]+)"[^>]+title="([^"]+)"/i); if(!match) return [];
    const title=decoder(match[2]); if(!isGrantCandidate(title)) return [];
    const posted=row.match(/data-cell-header="작성일 :">\s*(\d{4}-\d{2}-\d{2})/i)?.[1]||'';
    return [{sourceId:'jeonbuk-board',externalId:match[1],institution:'전북특별자치도',group:'지방자치단체',title,category:'지역·생활',audience:'도민·기관·기업',region:'전북',sourceName:'전북특별자치도 공고·고시',sourceUrl:`https://www.jeonbuk.go.kr/board/view.jeonbuk?boardId=BBS_0000129&dataSid=${match[1]}&menuCd=DOM_000000102002005000`,opensAt:dateAtSeoul(posted),closesAt:null,deadlineLabel:'공고문 확인',status:'open'}];
  });
}

function parseGyeongnamBusiness(html:string):IncomingNotice[] {
  return (html.match(/<li>[^]*?boardId=BBS_0000057[^]*?<\/li>/gi)||[]).flatMap(card=>{
    const id=card.match(/dataSid=([0-9]+)/i)?.[1];
    const title=decoder(card.match(/<h4[^>]*class="[^"]*ellipsis[^"]*"[^>]*>([^]*?)<\/h4>/i)?.[1]||'');
    if(!id||!title||!isGrantCandidate(title)) return [];
    const posted=card.match(/<p class="date">\s*(\d{4}-\d{2}-\d{2})\s*<\/p>/i)?.[1]||'';
    return [{sourceId:'gyeongnam-business',externalId:id,institution:'경상남도',group:'지방자치단체',title,category:'기업지원',audience:'중소기업·창업기업',region:'경남',sourceName:'경남기업119 지원사업',sourceUrl:`https://www.gyeongnam.go.kr/giup/board/view.gyeong?boardId=BBS_0000057&menuCd=DOM_000004604001000000&dataSid=${id}`,opensAt:dateAtSeoul(posted),closesAt:null,deadlineLabel:'공고문 확인',status:'open'}];
  });
}

function parseChungbuk(html:string):IncomingNotice[] {
  return (html.match(/<tr>[^]*?selectGosiPblancView\.do[^]*?<\/tr>/gi)||[]).flatMap(row=>{
    const match=row.match(/selectGosiPblancView\.do\?key=422&amp;no=([0-9]+)[^>]*>([^]*?)<\/a>/i); if(!match) return [];
    const title=decoder(match[2]); if(!isGrantCandidate(title)) return [];
    const posted=row.match(/<time datetime="(\d{4}-\d{2}-\d{2})"/i)?.[1]||'';
    return [{sourceId:'chungbuk-board',externalId:match[1],institution:'충청북도',group:'지방자치단체',title,category:'지역·생활',audience:'도민·기관·기업',region:'충북',sourceName:'충청북도 고시·공고',sourceUrl:`https://www.chungbuk.go.kr/www/selectGosiPblancView.do?key=422&no=${match[1]}`,opensAt:dateAtSeoul(posted),closesAt:null,deadlineLabel:'공고문 확인',status:'open'}];
  });
}

function parseJeju(body:string):IncomingNotice[] {
  try {
    const payload=JSON.parse(body) as {gosis?:Array<{no?:string;title?:string;dept?:string;date?:string}>};
    return (payload.gosis||[]).flatMap(item=>{
      const id=item.no||''; const title=decoder(item.title||''); if(!id||!title||!isGrantCandidate(title)) return [];
      return [{sourceId:'jeju-board',externalId:id,institution:'제주특별자치도',group:'지방자치단체',title,category:'지역·생활',audience:'도민·기관·기업',region:'제주',sourceName:'제주특별자치도 공고',sourceUrl:`https://www.jeju.go.kr/news/news/law/jeju2.htm#A_${id}`,opensAt:dateAtSeoul(item.date||''),closesAt:null,deadlineLabel:'공고문 확인',status:'open'}];
    });
  } catch { return []; }
}

function parseKocca(html:string):IncomingNotice[] {
  if(/<rss[\s>]/i.test(html)) return (html.match(/<item>[\s\S]*?<\/item>/gi)||[]).flatMap(item=>{
    const title=decoder(item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1]||'');
    const link=decoder(item.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/i)?.[1]||'');
    const externalId=/intcNo=([A-Z0-9]+)/i.exec(link)?.[1];
    if(!externalId||!title||!isGrantCandidate(title)) return [];
    const posted=item.match(/<pupDate><!\[CDATA\[(\d{4}-\d{2}-\d{2})/i)?.[1]||'';
    return [{sourceId:'kocca-support',externalId,institution:'한국콘텐츠진흥원',group:'공사·공단',title,category:'문화·콘텐츠',audience:'콘텐츠기업·창작자',region:null,sourceName:'한국콘텐츠진흥원 지원공고',sourceUrl:link.replace('http://','https://'),opensAt:dateAtSeoul(posted),closesAt:null,deadlineLabel:'공고문 확인',status:'open'}];
  });
  return (html.match(/<tr>[^]*?intcNo=[A-Z0-9]+[^]*?<\/tr>/gi)||[]).flatMap(row=>{
    const match=row.match(/intcNo=([A-Z0-9]+)[^>]*>([^]*?)<\/a>/i); if(!match) return [];
    const title=decoder(match[2]); if(!isGrantCandidate(title)) return [];
    const period=decoder(row.match(/data-label="접수기간">([^]*?)<\/td>/i)?.[1]||'');
    const dates=(period.match(/\d{2}\.\d{2}\.\d{2}/g)||[]).map(value=>`20${value.replaceAll('.','-')}`);
    const closes=dates[1]||''; const closed=Boolean(closes&&dateAtSeoul(closes,true)!<new Date());
    return [{sourceId:'kocca-support',externalId:match[1],institution:'한국콘텐츠진흥원',group:'공사·공단',title,category:'문화·콘텐츠',audience:'콘텐츠기업·창작자',region:null,sourceName:'한국콘텐츠진흥원 지원공고',sourceUrl:`https://www.kocca.kr/kocca/pims/view.do?intcNo=${match[1]}&menuNo=204104`,opensAt:dates[0]?dateAtSeoul(dates[0]):null,closesAt:closes?dateAtSeoul(closes,true):null,deadlineLabel:closes?closes.replaceAll('-','.'):'공고문 확인',status:closed?'closed':'open'}];
  });
}

async function collectBojoApi() {
  const key=env.BOJO_API_KEY;
  if(!key) return null;
  const kstNow=new Date(Date.now()+9*60*60*1000); const today=kstNow.toISOString().slice(0,10).replaceAll('-','');
  // Daily runs only need today and yesterday; keeping this window narrow avoids
  // slow provider fan-out while still covering delayed updates around midnight.
  const dates=Array.from({length:2},(_,i)=>{const date=new Date(kstNow);date.setUTCDate(date.getUTCDate()-i);return date.toISOString().slice(0,10).replaceAll('-','')});
  const responses=await Promise.all(dates.map(async date=>{
    const rows:BojoItem[]=[];
    for(let page=1;page<=20;page++) {
    const url=`https://apis.data.go.kr/1051000/MoefOpenAPI2025/T_OPD_ASBS_PBNS_UNITY?serviceKey=${key}&pageNo=${page}&numOfRows=100&resultType=json&bsnsyear=${kstNow.getUTCFullYear()}&pblanc_updt_dt=${date}`;
    const response=await fetch(url,{headers:{accept:'application/json','user-agent':'GongmoaCollector/1.0'},signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error(`기획예산처 API HTTP ${response.status}`);
    const result=unpackBojoPage(await response.json(),page,100);
    rows.push(...result.rows);
    if(result.nextPage===null) return rows;
    }
    throw new Error('보조금 변경분이 실행 한도를 초과했습니다. 전체 수집으로 보완이 필요합니다.');
  }));
  return parseBojoItems(responses.flat());
}

export function parseBojoItems(rows:BojoItem[]) {
  const today=new Date(Date.now()+9*60*60*1000).toISOString().slice(0,10);
  const seen=new Set<string>(); const items:IncomingNotice[]=[];
  for(const item of rows) {
    const title=cdata(item.PBLANC_NM); const closes=bojoDate(cdata(item.RCEPT_END_DE)||cdata(item.PBLANC_END_DE));
    if(!title||(closes&&closes<today)) continue;
    const popup=cdata(item.PBLANC_POPUP_URL)||cdata(item.BSNS_POPUP_URL)||'https://www.bojo.go.kr/bojo.do';
    const externalId=/nttId=([^&]+)/.exec(popup)?.[1]||`${cdata(item.DDTLBZ_ID)}-${cdata(item.PBLANC_BEGIN_DE)}`;
    if(!externalId||seen.has(externalId)) continue; seen.add(externalId);
    const institution=cdata(item.DLVPL_NM)||cdata(item.JRSD_NM)||'기획예산처'; const region=cdata(item.CTPRVN_NM)||null;
    const opens=cdata(item.RCEPT_BEGIN_DE)||cdata(item.PBLANC_BEGIN_DE);
    const openDate=bojoDate(opens); const closeDate=closes;
    const amount=cdata(item.SPORT_BGAMT).replaceAll(',','');
    const year=Number(cdata(item.BSNSYEAR));
    items.push({sourceId:'bojo',externalId,institution,group:/(특별시|광역시|특별자치|[가-힣]+도|시|군|구)$/.test(institution)?'지방자치단체':'중앙부처',title,category:'보조금',audience:(cdata(item.SPORT_TRGET_CN)||cdata(item.SPORT_CN_DC)||'기관·단체').slice(0,100),region,sourceName:'보조금통합포털 API',sourceUrl:popup,opensAt:openDate?dateAtSeoul(openDate):null,closesAt:closeDate?dateAtSeoul(closeDate,true):null,deadlineLabel:closeDate?closeDate.replaceAll('-','.'):'공고문 확인',status:'open',ministry:cdata(item.JRSD_NM)||null,businessYear:Number.isInteger(year)&&year>=1900&&year<=2200?year:null,announcedFrom:bojoDate(cdata(item.PBLANC_BEGIN_DE))||null,announcedTo:bojoDate(cdata(item.PBLANC_END_DE))||null,applicationFrom:bojoDate(cdata(item.RCEPT_BEGIN_DE))||null,applicationTo:bojoDate(cdata(item.RCEPT_END_DE))||null,supportBudget:/^\d+$/.test(amount)&&Number.isSafeInteger(Number(amount))?Number(amount):null,applicationMethod:cdata(item.REQST_RCEPT_MTH_CN)||null});
  }
  return items;
}

export async function upsertCollected(items:IncomingNotice[]) {
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
    for(const key of ['ministry','businessYear','announcedFrom','announcedTo','applicationFrom','applicationTo','supportBudget','applicationMethod'] as const) if(item[key]!==undefined&&existing[key]!==item[key]) changedFields.push(key);
    await db.insert(revisions).values({noticeId:existing.id,contentHash,changedFields:JSON.stringify(changedFields),discoveredAt:now});
    await db.update(notices).set({...item,contentHash,verifiedAt:now,updatedAt:now}).where(eq(notices.id,existing.id)); summary.updated++;
  }
  return summary;
}

export async function syncOfficialSources(requestedSourceIds?:readonly string[]) {
  await ensureSeeded();
  const db=getDb();
  const expired=await db.select({id:notices.id}).from(notices).where(and(eq(notices.status,'open'),lt(notices.closesAt,new Date())));
  if(expired.length) await db.update(notices).set({status:'closed',updatedAt:new Date()}).where(and(eq(notices.status,'open'),lt(notices.closesAt,new Date())));
  const allSourceItems=await db.select({id:sources.id,url:sources.url,name:sources.name}).from(sources);
  const selected=new Set(requestedSourceIds?.length?requestedSourceIds:SYNC_BATCHES[0]);
  const sourceItems=allSourceItems.filter(source=>selected.has(source.id));
  const [inspected,bojoItems]=await Promise.all([Promise.all(sourceItems.map(inspectSource)),selected.has('bojo')?collectBojoApi():Promise.resolve(null)]);
  if(bojoItems) {
    const apiCheck=inspected.find(x=>x.check.sourceId==='bojo');
    if(apiCheck) Object.assign(apiCheck.check,{outcome:'success',statusCode:200,keywordHits:bojoItems.length,pageTitle:'기획예산처 국고보조금 공모사업 API',message:null,finishedAt:new Date()});
  }
  const bizItems=parseBizinfo(inspected.find(x=>x.check.sourceId==='bizinfo')?.body||'');
  const moeItems=parseMoe(inspected.find(x=>x.check.sourceId==='moe-board')?.body||'');
  const mcstBody=inspected.find(x=>x.check.sourceId==='mcst-board')?.body||''; const mcstItems=parseMcst(mcstBody);
  const moisBody=inspected.find(x=>x.check.sourceId==='mois-board')?.body||''; const moisItems=parseMois(moisBody);
  const meBody=inspected.find(x=>x.check.sourceId==='me-board')?.body||''; const meItems=parseMe(meBody);
  const seoulBody=inspected.find(x=>x.check.sourceId==='seoul-board')?.body||''; const seoulItems=parseSeoul(seoulBody);
  const busanBody=inspected.find(x=>x.check.sourceId==='busan-board')?.body||''; const busanItems=parseBusan(busanBody);
  const incheonBody=inspected.find(x=>x.check.sourceId==='incheon-board')?.body||''; const incheonItems=parseIncheon(incheonBody);
  const daejeonBody=inspected.find(x=>x.check.sourceId==='daejeon-board')?.body||''; const daejeonItems=parseDaejeon(daejeonBody);
  const daeguBody=inspected.find(x=>x.check.sourceId==='daegu-board')?.body||''; const daeguItems=parseDaegu(daeguBody);
  const ulsanBody=inspected.find(x=>x.check.sourceId==='ulsan-board')?.body||''; const ulsanItems=parseUlsan(ulsanBody);
  const jeonbukBody=inspected.find(x=>x.check.sourceId==='jeonbuk-board')?.body||''; const jeonbukItems=parseJeonbuk(jeonbukBody);
  const gyeongnamBody=inspected.find(x=>x.check.sourceId==='gyeongnam-business')?.body||''; const gyeongnamItems=parseGyeongnamBusiness(gyeongnamBody);
  const chungbukBody=inspected.find(x=>x.check.sourceId==='chungbuk-board')?.body||''; const chungbukItems=parseChungbuk(chungbukBody);
  const jejuBody=inspected.find(x=>x.check.sourceId==='jeju-board')?.body||''; const jejuItems=parseJeju(jejuBody);
  const koccaBody=inspected.find(x=>x.check.sourceId==='kocca-support')?.body||''; const koccaItems=parseKocca(koccaBody);
  for(const [sourceId,count,minimum] of [['bizinfo',bizItems.length,5],['moe-board',moeItems.length,1]] as const) {
    const parsed=inspected.find(x=>x.check.sourceId===sourceId);
    if(parsed?.check.outcome==='success'&&count<minimum) Object.assign(parsed.check,{outcome:'parser_error',message:`목록 구조 확인 필요: ${count}건 해석`,finishedAt:new Date()});
  }
  for(const [sourceId,body,pattern] of [['mcst-board',mcstBody,/noticeView\.jsp\?pSeq=/g],['mois-board',moisBody,/nttId=[0-9]+/g],['me-board',meBody,/boardId=[0-9]+/g]] as const) {
    const parsed=inspected.find(x=>x.check.sourceId===sourceId); const structuralCount=(body.match(pattern)||[]).length;
    if(parsed?.check.outcome==='success'&&structuralCount<5) Object.assign(parsed.check,{outcome:'parser_error',message:`목록 구조 확인 필요: 링크 ${structuralCount}건`,finishedAt:new Date()});
  }
  for(const [sourceId,body,pattern] of [['seoul-board',seoulBody,/fnTbbsView\('[0-9]+'/g],['busan-board',busanBody,/\/nbgosi\/view\?sno=[0-9]+/g],['incheon-board',incheonBody,/\/IC010307\/view\?sno=[0-9]+/g]] as const) {
    const parsed=inspected.find(x=>x.check.sourceId===sourceId); const structuralCount=(body.match(pattern)||[]).length;
    if(parsed?.check.outcome==='success'&&structuralCount<5) Object.assign(parsed.check,{outcome:'parser_error',message:`목록 구조 확인 필요: 링크 ${structuralCount}건`,finishedAt:new Date()});
  }
  for(const [sourceId,body,pattern] of [['daejeon-board',daejeonBody,/recruitmentNoticeDetail\.do\?compSeq=/g],['daegu-board',daeguBody,/gn_goRead\('[0-9]+'\)/g]] as const) {
    const parsed=inspected.find(x=>x.check.sourceId===sourceId); const structuralCount=(body.match(pattern)||[]).length;
    if(parsed?.check.outcome==='success'&&structuralCount<3) Object.assign(parsed.check,{outcome:'parser_error',message:`목록 구조 확인 필요: 링크 ${structuralCount}건`,finishedAt:new Date()});
  }
  for(const [sourceId,body,pattern] of [['ulsan-board',ulsanBody,/\/[0-9]+\.ulsan\?/g],['jeonbuk-board',jeonbukBody,/dataSid=[0-9]+/g]] as const) {
    const parsed=inspected.find(x=>x.check.sourceId===sourceId); const structuralCount=(body.match(pattern)||[]).length;
    if(parsed?.check.outcome==='success'&&structuralCount<5) Object.assign(parsed.check,{outcome:'parser_error',message:`목록 구조 확인 필요: 링크 ${structuralCount}건`,finishedAt:new Date()});
  }
  for(const [sourceId,body,pattern] of [['gyeongnam-business',gyeongnamBody,/boardId=BBS_0000057[^"']*dataSid=[0-9]+/g]] as const) {
    const parsed=inspected.find(x=>x.check.sourceId===sourceId); const structuralCount=(body.match(pattern)||[]).length;
    if(parsed?.check.outcome==='success'&&structuralCount<5) Object.assign(parsed.check,{outcome:'parser_error',message:`목록 구조 확인 필요: 링크 ${structuralCount}건`,finishedAt:new Date()});
  }
  for(const [sourceId,body,pattern] of [['chungbuk-board',chungbukBody,/selectGosiPblancView\.do\?key=422&amp;no=[0-9]+/g]] as const) {
    const parsed=inspected.find(x=>x.check.sourceId===sourceId); const structuralCount=(body.match(pattern)||[]).length;
    if(parsed?.check.outcome==='success'&&structuralCount<10) Object.assign(parsed.check,{outcome:'parser_error',message:`목록 구조 확인 필요: 링크 ${structuralCount}건`,finishedAt:new Date()});
  }
  const jejuParsed=inspected.find(x=>x.check.sourceId==='jeju-board');
  if(jejuParsed?.check.outcome==='success'&&(!jejuBody.includes('"gosis"')||jejuItems.length<1)) Object.assign(jejuParsed.check,{outcome:'parser_error',message:`목록 구조 확인 필요: ${jejuItems.length}건 해석`,finishedAt:new Date()});
  const koccaParsed=inspected.find(x=>x.check.sourceId==='kocca-support'); const koccaLinks=(koccaBody.match(/intcNo=[A-Z0-9]+/g)||[]).length;
  if(koccaParsed?.check.outcome==='success'&&koccaLinks<5) Object.assign(koccaParsed.check,{outcome:'parser_error',message:`목록 구조 확인 필요: 링크 ${koccaLinks}건`,finishedAt:new Date()});
  for(const result of inspected) {
    await db.insert(sourceChecks).values(result.check);
    await db.update(sources).set({status:result.check.outcome==='success'?'connected':'attention',lastSuccessAt:result.check.outcome==='success'?result.check.finishedAt:undefined}).where(eq(sources.id,result.check.sourceId));
  }
  const incoming=[...bizItems,...moeItems,...mcstItems,...moisItems,...meItems,...seoulItems,...busanItems,...incheonItems,...daejeonItems,...daeguItems,...ulsanItems,...jeonbukItems,...gyeongnamItems,...chungbukItems,...jejuItems,...koccaItems,...(bojoItems||[])];
  const collection=await upsertCollected(incoming);
  collection.closed=expired.length;
  return {results:inspected.map(x=>x.check),collection,sourceIds:[...selected]};
}
