export const kinfaSource={id:'kinfa-board',institutionId:'public-138',name:'서민금융진흥원 일반공고',url:'https://www.kinfa.or.kr/notificationPromotion/notice.do'};

export function fetchKinfaList(fetcher:typeof fetch=fetch){
  return fetcher(kinfaSource.url,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});
}

function text(value:string){return value.replace(/<[^>]*>/g,' ').replace(/&#40;/g,'(').replace(/&#41;/g,')').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function invalid():never{throw new Error('서민금융진흥원 일반공고 구조 확인 필요');}
export function kinfaCandidate(title:string){
  if(/채용|입찰|용역|임차|개인정보|센터이전|작업공지|설문|의견수렴|공개검증|선정결과|결과보고|이벤트|명칭\s*공모전|후보자/.test(title))return false;
  return /(?:지원|육성|컨설팅|상생).*?(?:사업|프로그램).*?(?:모집|신청)|(?:모집|신청).*?(?:지원|컨설팅)|인정가게\s*모집/.test(title);
}

const reviewedClosed=new Set(['34895']);
export function parseKinfaBoard(html:string,knownIds:string[]=[]){
  if(html.length<5000||html.length>2_000_000)invalid();
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  if(!/전체\s*선택됨[\s\S]*일반공고\s*선택됨[\s\S]*입찰공고\s*선택됨/.test(text(clean)))invalid();
  const rows=[...clean.matchAll(/<li class="item type02"\s+data-noticeYn="([XY])"\s+data-rowNo="([1-9]\d*)"\s+data-seqBoardGeneral="([1-9]\d*)"\s+data-boardCode="00018"\s+data-boardDetailCode="00027">([\s\S]*?)<\/li>/g)];
  if(rows.length<10||rows.length>30)invalid();
  const known=new Set(knownIds),seen=new Map<string,string>();let pinned=0,excludedClosed=0;
  const items=rows.flatMap(match=>{
    const [,noticeYn,,id,body]=match; const title=text(body.match(/<p class="tit">([\s\S]*?)<\/p>/)?.[1]||'').replace(/^\[공지\]\s*/,'');
    const date=text(body.match(/<p class="date">\s*(\d{4}-\d{2}-\d{2})\s*<\/p>/)?.[1]||'');
    if(!title||!date||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)invalid();
    const signature=JSON.stringify([title,date]);
    if(seen.has(id)){if(seen.get(id)!==signature)invalid();return [];}
    seen.set(id,signature);if(noticeYn==='X')pinned++;
    if(reviewedClosed.has(id)){excludedClosed++;return known.has(id)?[{sourceId:kinfaSource.id,externalId:id,institution:'서민금융진흥원',group:'공사·공단',title,category:'자영업·금융복지',audience:'원문 신청주체·지원자격 확인',region:null,sourceName:kinfaSource.name,sourceUrl:`https://www.kinfa.or.kr/notificationPromotion/noticeDetail.do?seq=${id}`,announcedFrom:date,applicationFrom:null,applicationTo:null,opensAt:null,closesAt:null,deadlineLabel:'종료 확인',status:'closed',ministry:'금융위원회'}]:[];}
    if(!known.has(id)&&!kinfaCandidate(title))return [];
    return [{sourceId:kinfaSource.id,externalId:id,institution:'서민금융진흥원',group:'공사·공단',title,category:'자영업·금융복지',audience:'원문 신청주체·지원자격 확인',region:null,sourceName:kinfaSource.name,sourceUrl:`https://www.kinfa.or.kr/notificationPromotion/noticeDetail.do?seq=${id}`,announcedFrom:date,applicationFrom:null,applicationTo:null,opensAt:null,closesAt:null,deadlineLabel:'접수기간·지원조건 원문 확인',status:'unknown',ministry:'금융위원회'}];
  });
  return {items,parsedRows:rows.length,pinned,excludedClosed};
}
