// @ts-ignore Native Node test runner also uses explicit extensions.
import {centralGrantCandidate} from './central-collectors.ts';
// @ts-ignore Native Node test runner also uses explicit extensions.
import {applicationPeriod} from './application-period.ts';

export const kiatSource={id:'kiat-board',institutionId:'public-251',name:'한국산업기술진흥원 사업공고',url:'https://www.kiat.or.kr/front/board/boardContentsListPage.do?board_id=90'};
export const nipaSource={id:'nipa-board',institutionId:'public-031',name:'정보통신산업진흥원 사업공고',url:'https://www.nipa.kr/home/2-2'};
export function fetchKiatList(fetcher:typeof fetch=fetch){
  return fetcher('https://www.kiat.or.kr/front/board/boardContentsListAjax.do',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'},
    body:'board_id=90&miv_pageNo=1&miv_pageSize=10&mode=W&state_filter=W',signal:AbortSignal.timeout(10000),redirect:'manual',
  });
}
function text(s:string){return s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#(\d+);/g,(_,n)=>Number(n)<=0x10ffff?String.fromCodePoint(Number(n)):'').replace(/\s+/g,' ').trim();}
function validDay(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&applicationPeriod(`${s} ~ ${s}`)!==null;}
export function parseKiatBoard(html:string,now=Date.now()){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const table=clean.match(/<table\b[^>]*>\s*<caption>사업공고 리스트 화면<\/caption>([\s\S]*?)<\/table>/)?.[1];
  if(!table||!table.includes('접수기간'))throw new Error('KIAT 사업공고 목록 구조 확인 필요');
  const rows=[...table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(m=>m[0]).filter(s=>/class="[^"]*\btd_title\b/.test(s));
  if(rows.length<3)throw new Error('KIAT 사업공고 행 부족');
  const seen=new Set<string>();
  const items=rows.flatMap(row=>{
    const titleCell=row.match(/<td\b[^>]*class="[^"]*\btd_title\b[^"]*"[^>]*>([\s\S]*?)<\/td>/)?.[1]||'';
    const link=titleCell.match(/<a\b[^>]*href="javascript:contentsView\('([a-f0-9]{32})'\)"[^>]*>([\s\S]*?)<\/a>/);
    const posted=text(row.match(/<td\b[^>]*class="[^"]*\btd_reg_date\b[^"]*"[^>]*>([\s\S]*?)<\/td>/)?.[1]||'');
    const state=row.match(/<span\b[^>]*class="app_state"[^>]*>/)?.[0]||'';
    const start=state.match(/\bdata-start="([^"]*)"/)?.[1],end=state.match(/\bdata-end="([^"]*)"/)?.[1];
    if(!link||!text(link[2])||!validDay(posted)||start===undefined||end===undefined)throw new Error('KIAT 공고 제목·식별자·날짜 확인 필요');
    const range=start&&end?applicationPeriod(`${start} ~ ${end}`):null;
    if((start||end)&&!range)throw new Error('KIAT 접수기간 확인 필요');
    const title=text(link[2]),id=link[1];if(seen.has(id))return [];seen.add(id);
    if(/수요\s*조사|설명회|세미나|작성\s*안내|지원제도\s*안내/.test(title))return [];
    // This exact selection announcement was verified as an application invitation, not results.
    const candidate=/^2026년도 독일 등 유럽 진출 희망 중견기업 지원사업 선정 공고$/.test(title)?title.replace('선정 공고','모집 공고'):title;
    if(!/(공모|모집|공고)/.test(candidate)||!centralGrantCandidate('지원사업 '+candidate))return [];
    return [{sourceId:kiatSource.id,externalId:id,institution:'한국산업기술진흥원',group:'공사·공단',title,category:'산업·기술사업화',audience:'원문 지원자격 확인',region:null,sourceName:kiatSource.name,
      sourceUrl:`https://www.kiat.or.kr/front/board/boardContentsView.do?board_id=90&contents_id=${id}`,announcedFrom:posted,
      applicationFrom:range?.applicationFrom||null,applicationTo:range?.applicationTo||null,opensAt:range?.opensAt||null,closesAt:range?.closesAt||null,
      deadlineLabel:range?`${start} ~ ${end} · 일자 기준, 마감시각 원문 확인`:'접수기간 원문 확인',status:range&&range.closesAt.getTime()<now?'closed':'open',ministry:'산업통상부'}];
  });
  return {items,parsedRows:rows.length};
}

export function parseNipaBoard(html:string,now=Date.now()){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const table=clean.match(/<table\b[^>]*class="[^"]*\btbgg\b[^"]*"[^>]*>([\s\S]*?)<\/table>/)?.[1];
  if(!table)throw new Error('NIPA 사업공고 목록 확인 필요');
  const rows=[...table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(m=>m[0]).filter(s=>s.includes('class="tl"'));
  if(rows.length<3)throw new Error('NIPA 사업공고 행 부족');
  const seen=new Set<string>();
  const items=rows.flatMap(row=>{
    const cell=row.match(/<td class="tl">([\s\S]*?)<\/td>/)?.[1]||'';
    const link=cell.match(/<a\b[^>]*href="(\/home\/2-2\/(\d+))"[^>]*>([\s\S]*?)<\/a>/);
    const period=text(cell.match(/<span class="bco">\s*신청기간\s*:\s*([\s\S]*?)<\/span>/)?.[1]||'');
    const range=/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}\s*~\s*\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(period)?applicationPeriod(period):null;
    const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)];
    const posted=text(cells.at(-1)?.[1]||'');
    if(!link||!text(link[3])||!range||!validDay(posted))throw new Error('NIPA 공고 식별자·신청기간 확인 필요');
    const id=link[2],title=text(link[3]);if(seen.has(id))return [];seen.add(id);
    if(/수요\s*조사|설명회|세미나/.test(title)||!/(공모|모집|공고)/.test(title)||!centralGrantCandidate('지원사업 '+title))return [];
    return [{sourceId:nipaSource.id,externalId:id,institution:'정보통신산업진흥원',group:'공사·공단',title,category:'ICT·디지털',audience:'원문 지원자격 확인',region:null,sourceName:nipaSource.name,sourceUrl:`https://www.nipa.kr${link[1]}`,
      announcedFrom:posted,...range,deadlineLabel:period,status:range.closesAt.getTime()<now?'closed':'open',ministry:'과학기술정보통신부'}];
  });
  return {items,parsedRows:rows.length};
}
