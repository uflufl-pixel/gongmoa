export const centralCollectors=[
  {id:'mss-board',institutionId:'mss',institution:'중소벤처기업부',name:'중소벤처기업부 사업공고 RSS',url:'https://mss.go.kr/rss/smba/board/310.do',origin:'https://www.mss.go.kr',format:'rss',category:'기업지원'},
  {id:'mafra-board',institutionId:'central-1543000',institution:'농림축산식품부',name:'농림축산식품부 공지·공고 RSS',url:'https://www.mafra.go.kr/bbs/home/791/rssList.do?row=50',origin:'https://www.mafra.go.kr',format:'rss',category:'농림·식품'},
  {id:'moleg-board',institutionId:'central-1170000',institution:'법제처',name:'법제처 공지사항 RSS',url:'https://www.moleg.go.kr/rss/board.es?mid=a10504000000&bid=0010',origin:'https://www.moleg.go.kr',format:'rss',category:'행정·법제'},
  {id:'mohw-board',institutionId:'central-1352000',institution:'보건복지부',name:'보건복지부 공지사항',url:'https://www.mohw.go.kr/menu.es?mid=a10501010000',origin:'https://www.mohw.go.kr',format:'es',category:'보건·복지'},
  {id:'kdca-board',institutionId:'central-1790387',institution:'질병관리청',name:'질병관리청 공고·공시 RSS',url:'https://www.kdca.go.kr/bbs/kdca/51/rssList.do?row=50',origin:'https://www.kdca.go.kr',format:'rss',category:'보건·의료'},
  {id:'rda-board',institutionId:'central-1390000',institution:'농촌진흥청',name:'농촌진흥청 공지사항',url:'https://www.rda.go.kr/board/board.do?mode=list&prgId=nei_ancmttEntry',origin:'https://www.rda.go.kr',format:'rda',category:'농업·연구'},
  {id:'kma-board',institutionId:'central-1360000',institution:'기상청',name:'기상청 공지사항 RSS',url:'https://www.kma.go.kr/servlet/NeoboardProcess?mode=rss&bid=gongzi&url=http%3A%2F%2Fwww.kma.go.kr%2Fnotify%2Fnotice%2Flist.jsp',origin:'https://www.kma.go.kr',format:'rss',category:'기상·기후'},
  {id:'forest-board',institutionId:'central-1400000',institution:'산림청',name:'산림청 공고',url:'https://www.forest.go.kr/kfsweb/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_1032&mn=NKFS_04_01_02&pageIndex=1&pageUnit=10',origin:'https://www.forest.go.kr',format:'forest',category:'산림·임업'},
  {id:'forest-news',institutionId:'central-1400000',institution:'산림청',name:'산림청 알립니다',url:'https://www.forest.go.kr/kfsweb/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_1031&mn=NKFS_04_01_01&pageIndex=1&pageUnit=10',origin:'https://www.forest.go.kr',format:'forest',category:'산림·임업'},
  {id:'mfds-board',institutionId:'central-1471000',institution:'식품의약품안전처',name:'식품의약품안전처 공고 RSS',url:'https://www.mfds.go.kr/www/rss/brd.do?brdId=ntc0004',origin:'https://www.mfds.go.kr',format:'rss',category:'식품·의약품'},
  {id:'moel-board',institutionId:'central-1492000',institution:'고용노동부',name:'고용노동부 공지사항',url:'https://www.moel.go.kr/news/notice/noticeList.do',origin:'https://www.moel.go.kr',format:'moel',category:'고용·노동'},
  {id:'moel-support',institutionId:'central-1492000',institution:'고용노동부',name:'고용노동부 국고보조사업',url:'https://www.moel.go.kr/info/govsupport/govsupportcon/govSupportSubList.do?pageIndex=1',origin:'https://www.moel.go.kr',format:'moel',category:'고용·노동'},
  {id:'molit-board',institutionId:'central-1613000',institution:'국토교통부',name:'국토교통부 알림마당',url:'https://www.molit.go.kr/USR/BORD0201/m_69/LST.jsp?id=N01_B',origin:'https://www.molit.go.kr',format:'molit',category:'국토·교통'},
  {id:'mof-board',institutionId:'central-1192000',institution:'해양수산부',name:'해양수산부 공지사항',url:'https://www.mof.go.kr/doc/ko/selectDocList.do?menuSeq=375&bbsSeq=9',origin:'https://www.mof.go.kr',format:'mof',category:'해양·수산'},
] as const;
type Config=typeof centralCollectors[number];
export function centralGrantCandidate(title:string){
  if(/(선정\s*공고|우선협상.*선정)/.test(title))return false;
  if(/(체험단|연수생|면허.*시험|자격시험)/.test(title))return false;
  return /(공모|모집|지원사업|신규지원|시행계획|지원계획)/.test(title)&&!/(채용|임원|이사장|기관장|원장|본부장|강사|매니저|후보자|위원|참여단|직위|임용|근로자|공무직|공무원|전입희망|입찰|용역|개찰|결과|합격|공개검증|의견수렴|공시송달|취소|포상|서훈)/.test(title);
}
function text(s:string){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,' ').replace(/&#(x[\da-f]+|\d+);/gi,(_,v:string)=>{const n=v.startsWith('x')?parseInt(v.slice(1),16):Number(v);return n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function publicationDate(s:string){
  if(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(s)){
    const timestamp=Date.parse(s);
    if(Number.isFinite(timestamp)&&new Date(timestamp).toUTCString()===s)return new Date(timestamp+9*60*60*1000).toISOString().slice(0,10);
    return null;
  }
  const kst=/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{2}) \d{2}:\d{2}:\d{2} KST (\d{4})$/.exec(s);
  if(kst)s=`${kst[3]}-${String(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(kst[1])+1).padStart(2,'0')}-${kst[2]}`;
  const m=/^(\d{4})-?(\d{2})-?(\d{2})/.exec(s);if(!m)return null;
  const d=`${m[1]}-${m[2]}-${m[3]}`,date=new Date(d+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===d?d:null;
}
function identity(raw:string,c:Config){
  const u=new URL(raw,c.origin);if(!['https:','http:'].includes(u.protocol)||u.hostname!==new URL(c.origin).hostname||u.username||u.password)throw new Error('공식 공고 주소 확인 필요');
  let id:string|null=null;
  if(c.id==='mof-board'&&u.pathname==='/doc/ko/selectDoc.do'&&u.searchParams.get('bbsSeq')==='9'&&u.searchParams.get('menuSeq')==='375')id=u.searchParams.get('docSeq');
  if(c.id==='molit-board'&&u.pathname==='/USR/BORD0201/m_69/DTL.jsp'&&u.searchParams.get('id')==='N01_B'&&u.searchParams.get('mode')==='view')id=u.searchParams.get('idx');
  if(c.format==='moel'&&u.pathname===(c.id==='moel-board'?'/news/notice/noticeView.do':'/info/govsupport/govsupportcon/govSupportSubView.do'))id=u.searchParams.get('bbs_seq');
  if(c.id==='mfds-board'&&u.pathname==='/brd/m_76/view.do')id=u.searchParams.get('seq');
  if(c.format==='forest'){
    const path=u.pathname.replace(/;jsessionid=[A-Za-z0-9_.-]+$/,'');
    const board=c.id==='forest-board'?'BBSMSTR_1032':'BBSMSTR_1031';
    if(path==='/kfsweb/cop/bbs/selectBoardArticle.do'&&u.searchParams.get('bbsId')===board){
      id=u.searchParams.get('nttId');u.pathname=path;
      u.search='';u.searchParams.set('bbsId',board);u.searchParams.set('nttId',id||'');
    }
  }
  if(c.id==='kma-board'&&u.pathname==='/notify/notice/list.jsp'&&u.searchParams.get('bid')==='gongzi'&&u.searchParams.get('mode')==='view')id=u.searchParams.get('num');
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
      rows.push({title:c.id==='kma-board'?text(field('title')):field('title'),link:field('link'),posted:field('pubDate')});
    }
  }else if(c.format==='mof'){
    for(const match of body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)){
      const cell=match[0].match(/<td\b[^>]*class="tit"[^>]*>([\s\S]*?)<\/td>/);if(!cell)continue;
      const id=cell[1].match(/onclick="fn_selectDoc\('(\d+)'\)"/)?.[1];
      const title=cell[1].match(/title="\[게시글 바로가기\]\s*([^"]+)"/)?.[1];
      if(!id||!title)throw new Error('해양수산부 제목·식별자 확인 필요');
      rows.push({title:text(title),link:`${c.origin}/doc/ko/selectDoc.do?docSeq=${id}&menuSeq=375&bbsSeq=9`,posted:text(match[0].match(/<td class="t-date">([\s\S]*?)<\/td>/)?.[1]||'').replaceAll('.','-').replace(/-$/,'')});
    }
  }else if(c.format==='molit'){
    for(const match of body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)){
      const cell=match[0].match(/<td class="bd_title">([\s\S]*?)<\/td>/);if(!cell)continue;
      const a=cell[1].match(/<a href="([^"]+)">([\s\S]*?)<\/a>/);if(!a)throw new Error('국토교통부 제목·링크 확인 필요');
      rows.push({title:text(a[2]),link:new URL(text(a[1]),c.url).href,posted:text(match[0].match(/<td class=['"]bd_date['"]>([\s\S]*?)<\/td>/)?.[1]||'').replaceAll('.','-')});
    }
  }else if(c.format==='moel'){
    for(const match of body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)){
      const cell=match[0].match(/<td\b[^>]*aria-label="제목"[^>]*>([\s\S]*?)<\/td>/);if(!cell)continue;
      const a=cell[1].match(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if(!a)throw new Error('고용노동부 공고 링크 누락');
      rows.push({title:text(a[2]).replace(/^\[[^\]]+\]\s*/,''),link:text(a[1]),posted:(match[0].match(/aria-label="등록일"[^>]*>\s*(\d{4}\.\d{2}\.\d{2})/)?.[1]||'').replaceAll('.','-')});
    }
  }else if(c.format==='forest'){
    for(const match of body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)){
      if(!/<td class="left">/.test(match[0]))continue;
      const a=match[0].match(/<a href="([^"]*selectBoardArticle\.do[^"]*)" title="([^"]*)">/);
      if(!a)throw new Error('산림청 공고 링크·제목 구조 확인 필요');
      rows.push({title:text(a[2]),link:text(a[1]),posted:match[0].match(/<td>\s*(\d{4}-\d{2}-\d{2})/)?.[1]||''});
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
    let candidateTitle=c.id==='mfds-board'&&/용역연구개발과제.*주관연구기관.*공모/.test(row.title)?row.title.replace('용역연구개발과제','연구개발과제'):row.title;
    if(c.id==='mof-board'&&/(신규과제 선정계획|사업대상지.*선정 연장 공고)/.test(row.title))candidateTitle='지원사업 '+candidateTitle;
    if(!centralGrantCandidate(candidateTitle))return [];
    return [{sourceId:c.id,externalId:ref.id,institution:c.institution,group:'중앙부처',title:row.title,category:c.category,audience:'원문 지원자격 확인',region:null,sourceName:c.name,sourceUrl:ref.url,
      announcedFrom:publicationDate(row.posted),opensAt:null,closesAt:null,applicationFrom:null,applicationTo:null,deadlineLabel:'접수기간 원문 확인',status:'open'}];
  });
  return {items,parsedRows:rows.length};
}
