export const fipaSource={id:'fipa-education',institutionId:'public-322',name:'한국어촌어항공단 친환경양식 기술교육',url:'https://fipa.or.kr/eco/bbs/i-278/list.do'};
const base='https://fipa.or.kr/eco/bbs/i-278/';
type FipaItem={sourceId:string;externalId:string;institution:string;group:string;title:string;category:string;audience:string;region:null;sourceName:string;sourceUrl:string;announcedFrom:string;applicationFrom:string|null;applicationTo:string|null;opensAt:Date|null;closesAt:Date|null;deadlineLabel:string;status:string;ministry:string;applicationMethod:string};
function invalid():never{throw new Error('한국어촌어항공단 기술교육 구조 확인 필요');}
function plain(value:string){return value.replace(/<!--[^]*?-->/g,' ').replace(/<script\b[^>]*>[^]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();}
function rowsOf(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const rows=[...clean.matchAll(/<div class="board_box">([\s\S]*?)(?=<div class="board_box">|<\/div>\s*<div class="(?:paging|pagination)">)/g)].map(x=>x[1]);
  if(rows.length!==10)invalid();
  const seen=new Set<string>();
  return rows.map(row=>{const link=row.match(/<a href="\.\/detail\.do\?ntt_sn=([1-9]\d*)">([\s\S]*?)<\/a>/);const posted=plain(row.match(/등록일\s*:\s*<\/span>([^<]+)/)?.[1]||'').replaceAll('.','-');if(!link||!/^2026-\d{2}-\d{2}$/.test(posted)||seen.has(link[1]))invalid();seen.add(link[1]);return {id:link[1],title:plain(link[2]),posted};});
}
function isCandidate(title:string){return /친환경양식.*기술\s*교육.*교육생.*공모/.test(title)&&!/일정|사전등록|선정|결과|취소/.test(title);}
async function read(fetcher:typeof fetch,url:string,signal:AbortSignal){const response=await fetcher(url,{redirect:'manual',signal,headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});if(!response.ok)throw new Error(`FIPA ${new URL(url).searchParams.get('ntt_sn')||'list'} HTTP ${response.status}`);const body=await response.text();if(body.length<20_000||body.length>200_000)invalid();return body;}
export async function fetchFipaBundle(fetcher:typeof fetch=fetch){
  const signal=AbortSignal.timeout(20_000),list=await read(fetcher,fipaSource.url,signal),rows=rowsOf(list),candidates=rows.filter(x=>isCandidate(x.title));
  if(candidates.length<2||candidates.length>10)invalid();
  const details=await Promise.all(candidates.map(async row=>({id:row.id,html:await read(fetcher,`${base}detail.do?ntt_sn=${row.id}`,signal)})));
  return JSON.stringify({list,details});
}
function parsePeriod(body:string){
  const match=body.match(/(?:모집|접수)기간\s*:?\s*(2026)\.\s*(\d{1,2})\.\s*(\d{1,2})\.[^~]{0,15}~\s*(\d{1,2})\.\s*(\d{1,2})\.[^0-9]{0,15}(\d{1,2}):(\d{2})\s*까지/);if(!match)return null;
  const [,year,sm,sd,em,ed,h,m]=match,from=`${year}-${sm.padStart(2,'0')}-${sd.padStart(2,'0')}`,to=`${year}-${em.padStart(2,'0')}-${ed.padStart(2,'0')}`;
  const opensAt=new Date(`${from}T00:00:00+09:00`),closesAt=new Date(`${to}T${h.padStart(2,'0')}:${m}:00+09:00`),kst=(d:Date)=>new Date(d.getTime()+9*60*60*1000).toISOString().slice(0,10);if(!Number.isFinite(opensAt.getTime())||!Number.isFinite(closesAt.getTime())||kst(opensAt)!==from||kst(closesAt)!==to||Number(h)>23||Number(m)>59||opensAt>closesAt)invalid();return {from,to,opensAt,closesAt,label:`${to} ${h.padStart(2,'0')}:${m}`};
}
export function collectFipaBundle(input:string,knownIds:string[]=[],now=new Date()){
  let data:{list?:unknown;details?:unknown};try{data=JSON.parse(input);}catch{invalid();}if(typeof data.list!=='string'||!Array.isArray(data.details))invalid();
  const rows=rowsOf(data.list),byId=new Map(rows.map(x=>[x.id,x])),known=new Set(knownIds),seen=new Set<string>();
  const items=(data.details as Array<Record<string,unknown>>).flatMap<FipaItem>(detail=>{if(typeof detail.id!=='string'||typeof detail.html!=='string'||seen.has(detail.id))invalid();seen.add(detail.id);const row=byId.get(detail.id);if(!row||!isCandidate(row.title))invalid();
    const html=detail.html,title=plain((html.match(/<div class="view_tit">[\s\S]*?<strong>([\s\S]*?)<\/strong>/)?.[1]||'').replace(/<span class="post_new">[\s\S]*?<\/span>\s*<\/span>/,'')),posted=plain(html.match(/등록일\s*:\s*<\/span>([^<]+)/)?.[1]||'').replaceAll('.','-'),body=plain(html.match(/<div class="view_con">([\s\S]*?)<\/div>/)?.[1]||'');
    if(title!==row.title||posted!==row.posted||!body.includes('교육생')||!/(?:접수|모집)기간 외/.test(body)||!new RegExp(`down\\.do\\?bbs_id=2002&amp;atfile_sn=1&amp;data_ty_cd=A&amp;ntt_sn=${row.id}`).test(html))invalid();
    const period=parsePeriod(body);if(!period)return known.has(row.id)?[{sourceId:fipaSource.id,externalId:row.id,institution:'한국어촌어항공단',group:'공사·공단',title,category:'교육·역량지원',audience:'친환경양식 기술교육 신청 희망자 · 세부 자격은 첨부 공고문 확인',region:null,sourceName:fipaSource.name,sourceUrl:`${base}detail.do?ntt_sn=${row.id}`,announcedFrom:posted,applicationFrom:null,applicationTo:null,opensAt:null,closesAt:null,deadlineLabel:'접수기간 원문 확인',status:'unknown',ministry:'해양수산부',applicationMethod:'첨부 공고문 신청서와 제출방법 확인'}]:[];
    const ended=now>period.closesAt;if(ended&&!known.has(row.id))return [];
    return [{sourceId:fipaSource.id,externalId:row.id,institution:'한국어촌어항공단',group:'공사·공단',title,category:'교육·역량지원',audience:'친환경양식 기술교육 신청 희망자 · 세부 자격은 첨부 공고문 확인',region:null,sourceName:fipaSource.name,sourceUrl:`${base}detail.do?ntt_sn=${row.id}`,announcedFrom:posted,applicationFrom:period.from,applicationTo:period.to,opensAt:period.opensAt,closesAt:period.closesAt,deadlineLabel:period.label,status:ended?'closed':now<period.opensAt?'upcoming':'open',ministry:'해양수산부',applicationMethod:'첨부 공고문 신청서와 제출방법 확인'}];
  });
  if(seen.size!==rows.filter(x=>isCandidate(x.title)).length)invalid();
  return {items,parsedRows:rows.length,parsedDetails:seen.size};
}
