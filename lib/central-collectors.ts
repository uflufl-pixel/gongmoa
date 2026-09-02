export const centralCollectors=[
  {id:'mss-board',institutionId:'mss',institution:'중소벤처기업부',name:'중소벤처기업부 사업공고 RSS',url:'https://mss.go.kr/rss/smba/board/310.do',origin:'https://www.mss.go.kr',format:'rss',category:'기업지원'},
  {id:'mafra-board',institutionId:'central-1543000',institution:'농림축산식품부',name:'농림축산식품부 공지·공고 RSS',url:'https://www.mafra.go.kr/bbs/home/791/rssList.do?row=50',origin:'https://www.mafra.go.kr',format:'rss',category:'농림·식품'},
  {id:'moleg-board',institutionId:'central-1170000',institution:'법제처',name:'법제처 공지사항 RSS',url:'https://www.moleg.go.kr/rss/board.es?mid=a10504000000&bid=0010',origin:'https://www.moleg.go.kr',format:'rss',category:'행정·법제'},
  {id:'mohw-board',institutionId:'central-1352000',institution:'보건복지부',name:'보건복지부 공지사항',url:'https://www.mohw.go.kr/menu.es?mid=a10501010000',origin:'https://www.mohw.go.kr',format:'es',category:'보건·복지'},
  {id:'kdca-board',institutionId:'central-1790387',institution:'질병관리청',name:'질병관리청 공고·공시 RSS',url:'https://www.kdca.go.kr/bbs/kdca/51/rssList.do?row=50',origin:'https://www.kdca.go.kr',format:'rss',category:'보건·의료'},
  {id:'rda-board',institutionId:'central-1390000',institution:'농촌진흥청',name:'농촌진흥청 공지사항',url:'https://www.rda.go.kr/board/board.do?mode=list&prgId=nei_ancmttEntry',origin:'https://www.rda.go.kr',format:'rda',category:'농업·연구'},
] as const;
type Config=typeof centralCollectors[number];
export function centralGrantCandidate(title:string){
  if(/(체험단|연수생|면허.*시험|자격시험)/.test(title))return false;
  return /(공모|모집|지원사업|신규지원|시행계획|지원계획)/.test(title)&&!/(채용|임원|이사장|기관장|원장|본부장|강사|매니저|후보자|위원|참여단|직위|임용|근로자|공무직|공무원|전입희망|입찰|용역|개찰|결과|합격|공개검증|의견수렴|공시송달|취소|포상|서훈)/.test(title);
}
function text(s:string){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,' ').replace(/&#(x[\da-f]+|\d+);/gi,(_,v:string)=>{const n=v.startsWith('x')?parseInt(v.slice(1),16):Number(v);return n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function publicationDate(s:string){
  const m=/^(\d{4})-?(\d{2})-?(\d{2})/.exec(s);if(!m)return null;
  const d=`${m[1]}-${m[2]}-${m[3]}`,date=new Date(d+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===d?d:null;
}
function identity(raw:string,c:Config){
  const u=new URL(raw,c.origin);if(!['https:','http:'].includes(u.protocol)||u.hostname!==new URL(c.origin).hostname||u.username||u.password)throw new Error('공식 공고 주소 확인 필요');
  let id:string|null=null;
  if(c.id==='rda-board'&&u.pathname==='/board/board.do'&&u.searchParams.get('boardId')==='ancmtt'&&u.searchParams.get('prgId')==='nei_ancmttEntry'&&u.searchParams.get('mode')==='updateCnt')id=u.searchParams.get('dataNo');
  if(c.id==='kdca-board')id=/^\/bbs\/kdca\/51\/(\d+)\/artclView.do$/.exec(u.pathname)?.[1]||null;
  if(c.id==='mss-board'&&u.pathname==='/site/smba/ex/bbs/View.do'&&u.searchParams.get('cbIdx')==='310')id=u.searchParams.get('bcIdx');
  if(c.id==='mafra-board')id=/^\/bbs\/home\/791\/(\d+)\/artclView.do$/.exec(u.pathname)?.[1]||null;
  if((c.id==='moleg-board'||c.id==='mohw-board')&&u.pathname==='/board.es'&&u.searchParams.get('bid')===(c.id==='moleg-board'?'0010':'0003')&&u.searchParams.get('act')==='view')id=u.searchParams.get('list_no');
  if(!id||!/^\d+$/.test(id))throw new Error('공식 공고 식별자 확인 필요');
  u.protocol='https:';return {id,url:u.href};
}
export function parseCentralBoard(body:string,c:Config){
  const rows:Array<{title:string;link:string;posted:string}>=[];
  if(c.format==='rss'){
    if(!/<rss\b/.test(body)||!/<channel>/.test(body))throw new Error('RSS 구조 확인 필요');
    for(const match of body.matchAll(/<item>[\s\S]*?<\/item>/g)){
      const field=(tag:string)=>text(match[0].match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]||'');
      rows.push({title:field('title'),link:field('link'),posted:field('pubDate')});
    }
  }else if(c.format==='rda'){
    if(!/공지사항 리스트/.test(body))throw new Error('농촌진흥청 공지 목록 구조 확인 필요');
    for(const match of body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)){
      const cell=match[0].match(/<td\b[^>]*aria-label="제목"[^>]*>([\s\S]*?)<\/td>/);
      if(!cell)continue;
      const a=cell[1].match(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if(!a)throw new Error('농촌진흥청 공고 링크 누락');
      rows.push({title:text(a[2]),link:text(a[1]),posted:text(match[0].match(/aria-label="작성일"[^>]*>([\s\S]*?)<\/td>/)?.[1]||'')});
    }
  }else{
    for(const match of body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)){
      const a=match[0].match(/<a href="([^"]+)" class="txt_title">([\s\S]*?)<\/a>/);if(!a)continue;
      rows.push({title:text(a[2].replace(/<span class="sr_only">[\s\S]*?<\/span>/g,'')),link:text(a[1]),posted:text(match[0].match(/data-label="등록일">([^<]+)/)?.[1]||'')});
    }
  }
  if(rows.length<3)throw new Error('목록 구조 확인 필요: 공고 행 부족');
  const seen=new Set<string>();
  const items=rows.flatMap(row=>{
    if(!row.title||!row.link)throw new Error('목록 제목·링크 누락');
    const ref=identity(row.link,c);if(seen.has(ref.id))return [];seen.add(ref.id);
    if(!centralGrantCandidate(row.title))return [];
    return [{sourceId:c.id,externalId:ref.id,institution:c.institution,group:'중앙부처',title:row.title,category:c.category,audience:'원문 지원자격 확인',region:null,sourceName:c.name,sourceUrl:ref.url,
      announcedFrom:publicationDate(row.posted),opensAt:null,closesAt:null,applicationFrom:null,applicationTo:null,deadlineLabel:'접수기간 원문 확인',status:'open'}];
  });
  return {items,parsedRows:rows.length};
}
