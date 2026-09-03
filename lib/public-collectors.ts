// @ts-ignore Native Node test runner also uses explicit extensions.
import {centralGrantCandidate} from './central-collectors.ts';
// @ts-ignore Native Node test runner also uses explicit extensions.
import {applicationPeriod} from './application-period.ts';

export const kiatSource={id:'kiat-board',institutionId:'public-251',name:'한국산업기술진흥원 사업공고',url:'https://www.kiat.or.kr/front/board/boardContentsListPage.do?board_id=90'};
export const nipaSource={id:'nipa-board',institutionId:'public-031',name:'정보통신산업진흥원 사업공고',url:'https://www.nipa.kr/home/2-2'};
export const keitiSource={id:'keiti-board',institutionId:'public-340',name:'한국환경산업기술원 공지·공고',url:'https://www.keiti.re.kr/site/keiti/ex/board/List.do?cbIdx=277'};
export const kosmeSource={id:'kosme-esg',institutionId:'public-301',name:'중소벤처기업진흥공단 ESG 지원사업',url:'https://kdoctor.kosmes.or.kr/esgplatform/board/board13.do'};
export function fetchKosmeList(fetcher:typeof fetch=fetch){
  return fetcher(kosmeSource.url,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});
}
export function parseKosmeBoard(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const table=clean.match(/<div\b[^>]*class="board_table"[^>]*>\s*<table\b[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if(!table||!table.includes('작성일')||!table.includes('제목'))throw new Error('KOSME ESG 목록 구조 확인 필요');
  const rows=[...table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(x=>x[0]).filter(x=>/<td\b/i.test(x));
  if(rows.length<3)throw new Error('KOSME ESG 공고 행 부족');
  const seen=new Set<string>();
  const items=rows.flatMap(row=>{
    const tag=row.match(/^<tr\b[^>]*>/i)?.[0]||'';
    const action=tag.match(/\bonclick="([^"]*)"/i)?.[1]||'';
    const id=/^(?:javascript:)?Board\.Move\('frmInfo',\s*'board13View\.do',\s*'',\s*([1-9]\d*)\);?$/.exec(action)?.[1];
    const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>text(x[1]));
    if(!id||cells.length!==4||!cells[1]||!validDay(cells[2]))throw new Error('KOSME ESG 제목·식별자·게시일 확인 필요');
    if(seen.has(id))return [];seen.add(id);
    const title=cells[1];
    // Only beneficiary-enterprise invitations; repost attribution and supplier recruitment are deferred.
    if(!/(수요기업|참여기업|지원기업|수혜기업)\s*모집/.test(title)||!centralGrantCandidate(title)||/설명회|세미나|수강생|교육생|검증기관|원가계산기관|수행기관|공급기업|컨설턴트|수요\s*조사/.test(title))return [];
    return [{sourceId:kosmeSource.id,externalId:id,institution:'중소벤처기업진흥공단',group:'공사·공단',title,category:'ESG·탄소중립',audience:'중소기업 (원문 지원자격 확인)',region:null,sourceName:kosmeSource.name,sourceUrl:`https://kdoctor.kosmes.or.kr/esgplatform/board/board13View.do?idx=${id}`,announcedFrom:cells[2],applicationFrom:null,applicationTo:null,opensAt:null,closesAt:null,deadlineLabel:'접수기간 원문 확인',status:'open',ministry:'중소벤처기업부'}];
  });
  return {items,parsedRows:rows.length};
}
export async function fetchKeitiList(fetcher:typeof fetch=fetch){
  const signal=AbortSignal.timeout(10000);
  const pages=await Promise.all([1,2,3].map(async page=>{
    const r=await fetcher(`${keitiSource.url}&pageIndex=${page}`,{signal,redirect:'manual',headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});
    if(!r.ok)throw new Error(`KEITI 목록 HTTP ${r.status}`);
    const body=await r.text();parseKeitiBoard(body);return body;
  }));
  if(new Set(pages.map(p=>parseKeitiBoard(p).rowIds.join(','))).size!==3)throw new Error('KEITI 페이지 중복 확인 필요');
  return new Response(pages.join('\n'),{headers:{'content-type':'text/html; charset=utf-8'}});
}
export function fetchKiatList(fetcher:typeof fetch=fetch){
  return fetcher('https://www.kiat.or.kr/front/board/boardContentsListAjax.do',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'},
    body:'board_id=90&miv_pageNo=1&miv_pageSize=10&mode=W&state_filter=W',signal:AbortSignal.timeout(10000),redirect:'manual',
  });
}
function text(s:string){return s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#(\d+);/g,(_,n)=>Number(n)<=0x10ffff?String.fromCodePoint(Number(n)):'').replace(/\s+/g,' ').trim();}
function validDay(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&applicationPeriod(`${s} ~ ${s}`)!==null;}
export function parseKeitiBoard(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const lists=[...clean.matchAll(/<div class="thumb">\s*<ul class="list[^\"]*">([\s\S]*?)<\/ul>/g)];
  if(!lists.length)throw new Error('KEITI 공지 목록 구조 확인 필요');
  const rows=lists.flatMap(list=>[...list[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(x=>x[1]));
  if(rows.length<3)throw new Error('KEITI 공지 행 부족');
  const seen=new Set<string>();
  const items=rows.flatMap(row=>{
    const href=row.match(/<a\b[^>]*href="([^"]+)"/)?.[1];
    const title=text(row.match(/<span class="subject">([\s\S]*?)<\/span>/)?.[1]||'');
    const posted=text(row.match(/<span class="date">([\s\S]*?)<\/span>/)?.[1]||'');
    if(!href||!title||!validDay(posted))throw new Error('KEITI 공고 제목·게시일 확인 필요');
    const u=new URL(text(href),'https://www.keiti.re.kr');const id=u.searchParams.get('bcIdx');
    if(u.origin!=='https://www.keiti.re.kr'||u.username||u.password||u.pathname!=='/site/keiti/ex/board/View.do'||u.searchParams.get('cbIdx')!=='277'||!id||!/^\d+$/.test(id))throw new Error('KEITI 공식 공고 식별자 확인 필요');
    if(seen.has(id))return [];seen.add(id);
    if(/시상|교육생|평가단|세미나|수요\s*조사|신청내용|접수.*종료|신청.*종료/.test(title)||!centralGrantCandidate(title))return [];
    return [{sourceId:keitiSource.id,externalId:id,institution:'한국환경산업기술원',group:'공사·공단',title,category:'환경·녹색산업',audience:'원문 지원자격 확인',region:null,sourceName:keitiSource.name,
      sourceUrl:`https://www.keiti.re.kr/site/keiti/ex/board/View.do?cbIdx=277&bcIdx=${id}`,announcedFrom:posted,applicationFrom:null,applicationTo:null,opensAt:null,closesAt:null,deadlineLabel:'접수기간 원문 확인',status:'open',ministry:'기후에너지환경부'}];
  });
  return {items,parsedRows:rows.length,rowIds:[...seen]};
}
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

export function parseKoccaBoard(html:string,now=Date.now()){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const rows=[...clean.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(x=>x[0]).filter(x=>x.includes('data-label="제목"'));
  if(rows.length<3)throw new Error('KOCCA 공고 행 부족');
  const seen=new Set<string>();
  const items=rows.flatMap(row=>{
    const cell=row.match(/<td\b[^>]*data-label="제목"[^>]*>([\s\S]*?)<\/td>/)?.[1]||'';
    const a=cell.match(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const field=(label:string)=>text(row.match(new RegExp(`<td[^>]*data-label="${label}"[^>]*>([\\s\\S]*?)<\\/td>`))?.[1]||'');
    const short=(s:string)=>/^\d{2}\.\d{2}\.\d{2}$/.test(s)?`20${s.replaceAll('.','-')}`:'';
    const posted=short(field('공고일')),period=field('접수기간');const dates=period.split(/\s*~\s*/).map(short);
    const range=dates.length===2?applicationPeriod(`${dates[0]} ~ ${dates[1]}`):null;
    const continuous=/상시|소진\s*시/.test(text(a?.[2]||''))||/^상시(?:\s*모집)?$/.test(period);
    if(!a||!text(a[2])||!validDay(posted)||(!continuous&&!range))throw new Error('KOCCA 제목·접수기간 확인 필요');
    const u=new URL(text(a[1]),'https://www.kocca.kr'),id=u.searchParams.get('intcNo');
    if(u.origin!=='https://www.kocca.kr'||u.username||u.password||u.pathname!=='/kocca/pims/view.do'||u.searchParams.get('menuNo')!=='204104'||!id||!/^\d{3}[A-Z]\d{8}$/.test(id))throw new Error('KOCCA 공식 공고 식별자 확인 필요');
    if(seen.has(id))return [];seen.add(id);const title=text(a[2]);if(!centralGrantCandidate(title))return [];
    return [{sourceId:'kocca-support',externalId:id,institution:'한국콘텐츠진흥원',group:'공사·공단',title,category:'문화·콘텐츠',audience:'원문 지원자격 확인',region:null,sourceName:'한국콘텐츠진흥원 지원공고',sourceUrl:`https://www.kocca.kr/kocca/pims/view.do?intcNo=${id}&menuNo=204104`,announcedFrom:posted,
      applicationFrom:continuous?null:range!.applicationFrom,applicationTo:continuous?null:range!.applicationTo,opensAt:continuous?null:range!.opensAt,closesAt:continuous?null:range!.closesAt,
      deadlineLabel:continuous?'상시 모집 · 원문 접수조건 확인':`${range!.applicationFrom} ~ ${range!.applicationTo} · 일자 기준, 마감시각 원문 확인`,status:!continuous&&range!.closesAt.getTime()<now?'closed':'open',ministry:'문화체육관광부'}];
  });
  return {items,parsedRows:rows.length};
}
