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
  return {items,parsedRows:rows.length,pinned,external,signatures:Object.fromEntries(seen)};
}

// Narrow rollout: new second-page candidates require a reviewed detail contract.
// Closed historical rounds are ID-based, even if moved to the first page.
const closedRounds=new Set(['19542','19506','19507']);
export async function fetchKawfBundle(fetcher:typeof fetch=fetch){
  const signal=AbortSignal.timeout(20000);
  async function read(url:string,init:RequestInit={}){
    const r=await fetcher(url,{...init,signal,redirect:'manual'});
    if(!r.ok)throw new Error(`KAWF HTTP ${r.status}`);
    const body=await r.text();if(body.length>1_000_000)invalid();return body;
  }
  const first=await read(kawfSource.url);
  const second=await read(kawfSource.url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'cpg=2&searchCondition=0&searchKeyword='});
  if(!/title=현재페이지>1<\/a>/.test(first)||!/title=현재페이지>2<\/a>/.test(second))invalid();
  const found=[parseKawfBoard(first),parseKawfBoard(second)].some(p=>p.signatures['19590']);
  const detail=found?await read('https://www.kawf.kr/notice/sub02View.do?selIdx=19590'):null;
  return JSON.stringify({first,second,detail});
}
export function collectKawfBundle(input:string,knownIds:string[]=[],now=new Date()){
  const data=JSON.parse(input);
  if(typeof data.first!=='string'||typeof data.second!=='string'||!(data.detail===null||typeof data.detail==='string'))invalid();
  const first=parseKawfBoard(data.first,knownIds),second=parseKawfBoard(data.second,knownIds);
  for(const [id,sig] of Object.entries(second.signatures))if(first.signatures[id]&&first.signatures[id]!==sig)invalid();
  const known=new Set(knownIds),seen=new Set<string>();let deferred=0,excludedClosed=0;
  const items=[...first.items.map(item=>({item,page:1})),...second.items.map(item=>({item,page:2}))].flatMap(({item,page})=>{
    const id=item.externalId;if(seen.has(id))return [];seen.add(id);
    if(closedRounds.has(id)){excludedClosed++;return known.has(id)?[{...item,status:'closed'}]:[];}
    if(id==='19590'){
      if(!data.detail)invalid();
      const clean=data.detail.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
      const title=plain(clean.match(/<h5 class="view-title">([\s\S]*?)<\/h5>/)?.[1]||'');
      const body=plain(clean.match(/<div class="view-con">([\s\S]*?)<\/div>/)?.[1]||'');
      if(!/name="selIdx" value="19590"/.test(clean)||title!==item.title||!body.includes('2026년 전세자금 융자 사업'))invalid();
      if(item.status==='closed'||/접수\s*:?\s*(종료|중단|마감)|사업\s*(종료|중단)/.test(body)){
        excludedClosed++;return known.has(id)?[{...item,status:'closed'}]:[];
      }
      if(
        !/접수\s*:\s*상시/.test(body)||!body.includes('예술활동증명을 완료한 예술인')||
        !body.includes('방문 접수만 가능')||!body.includes('사전 예약')||!body.includes('예산 소진 시 조기 마감'))invalid();
      if(new Date(now.getTime()+9*60*60*1000).getUTCFullYear()!==2026){
        deferred++;return known.has(id)?[{...item,status:'unknown'}]:[];
      }
      return [{...item,audience:'예술활동증명 완료 예술인 · 임차보증금 등 원문 조건 확인',applicationMethod:'재단 홈페이지 사전 예약 후 방문 접수만 가능',deadlineLabel:'상시·예산 소진 시 조기 마감 · 2026년 한시 운영',status:'unknown'}];
    }
    if(!known.has(id)&&(page===2||id==='19562')){deferred++;return [];}
    return [item];
  });
  return {items,parsedRows:first.parsedRows+second.parsedRows,pinned:first.pinned+second.pinned,deferred,excludedClosed};
}
