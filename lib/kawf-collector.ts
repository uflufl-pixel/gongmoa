export const kawfSource={id:'kawf-board',institutionId:'public-193',name:'한국예술인복지재단 사업공고',url:'https://www.kawf.kr/notice/sub02.do'};
export function fetchKawfList(fetcher:typeof fetch=fetch){return fetcher(kawfSource.url,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});}
export function kawfCandidate(title:string){
  if(/마감|종료|결과|선정\s*공고|보고서|교부신청|제도\s*운영|방문예약|개인정보|채용|입찰|위원|강사|취소/.test(title))return false;
  return /융자.*(사업|안내)|(?:교육|특강).*신청|서비스\s*지원|지원사업.*모집/.test(title);
}
function plain(s:string){return s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function invalid():never{throw new Error('예술인복지재단 사업공고 구조 확인 필요');}
export function parseKawfBoard(html:string,knownIds:string[]=[]){
  if(html.length>1_000_000)invalid();
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const table=clean.match(/<div class="board-list" role="table" aria-label="표 사업공고">[\s\S]*?<ul role="rowgroup">([\s\S]*?)<\/ul>/)?.[1];
  if(!table)invalid();
  const rows=[...table.matchAll(/<li role="row">([\s\S]*?)<\/li>/g)].map(m=>m[1]).filter(r=>!r.includes('role="columnheader"'));
  if(!rows.length||rows.length>30)invalid();
  const seen=new Map<string,string>(),known=new Set(knownIds);let pinned=0,external=0;
  const items=rows.flatMap(row=>{
    const cell=row.match(/<p role="cell" class="title Common_Bbs_Table_Type1_Item" data-pIdx="([1-9]\d*)" pUrl="([^"]*)">([\s\S]*?)<\/p>/);
    const date=plain(row.match(/<p role="cell" class="date">([\s\S]*?)<\/p>/)?.[1]||'');
    const number=plain(row.match(/<p role="cell" class="number">([\s\S]*?)<\/p>/)?.[1]||'');
    if(!cell||!/^\d{2}\.\d{2}\.\d{2}$/.test(date)||!(/^[1-9]\d*$/.test(number)||number==='공지'))invalid();
    const title=plain(cell[3].match(/<a\b[^>]*>([\s\S]*?)<\/a>/)?.[1]||'');if(!title)invalid();
    // This contemporary board renders years as YY; only publication metadata uses 20YY.
    const posted='20'+date.replaceAll('.','-'),d=new Date(posted+'T00:00:00Z');
    if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==posted)invalid();
    const signature=JSON.stringify([title,posted,cell[2]]);
    if(seen.has(cell[1])){if(seen.get(cell[1])!==signature)invalid();return [];}
    seen.set(cell[1],signature);if(number==='공지')pinned++;
    if(cell[2]){external++;return [];}
    if(!known.has(cell[1])&&!kawfCandidate(title))return [];
    return [{sourceId:kawfSource.id,externalId:cell[1],institution:'한국예술인복지재단',group:'공사·공단',title,
      category:/융자/.test(title)?'융자·금융지원(상환 필요)':/교육|특강/.test(title)?'교육·역량지원':'서비스 지원',audience:'원문 신청주체·지원자격 확인',region:null,
      sourceName:kawfSource.name,sourceUrl:`https://www.kawf.kr/notice/sub02View.do?selIdx=${cell[1]}`,announcedFrom:posted,
      applicationFrom:null,applicationTo:null,opensAt:null,closesAt:null,deadlineLabel:'접수기간·잔여예산 원문 확인',status:/마감|종료/.test(title)?'closed':'unknown',ministry:'문화체육관광부'}];
  });
  return {items,parsedRows:rows.length,pinned,external};
}
