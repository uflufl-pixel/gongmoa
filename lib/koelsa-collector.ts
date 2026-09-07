export const koelsaSource={id:'koelsa-startup',institutionId:'public-331',name:'한국승강기안전공단 창업·벤처기업 지원사업',url:'https://home.koelsa.or.kr/portal/bbs/view.do?bIdx=15096&mId=0401000000&ptIdx=112'};
const posterUrl='https://home.koelsa.or.kr/common/imgView.do?attachId=071959575d2e5946e95655127944b424c62ef901aeb1e5b9ed9129b983b833eb&fileSn=f9a1967c526603d17ab488b9d2747cda&mode=origin';
const posterHash='ac62751c2e3d66c2f88de8cb815ddab3bca68bbadbb62bf0dc2698399ac24a15';
function invalid():never{throw new Error('한국승강기안전공단 창업·벤처 지원 구조 확인 필요');}
async function sha256(bytes:ArrayBuffer){const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
export async function fetchKoelsaBundle(fetcher:typeof fetch=fetch){
  const signal=AbortSignal.timeout(20_000),headers={'user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'};
  const [detail,poster]=await Promise.all([fetcher(koelsaSource.url,{redirect:'manual',signal,headers:{...headers,accept:'text/html'}}),fetcher(posterUrl,{redirect:'manual',signal,headers:{...headers,accept:'image/jpeg'}})]);
  if(!detail.ok||!poster.ok)throw new Error(`KOELSA support HTTP ${detail.status}/${poster.status}`);
  const html=await detail.text(),bytes=await poster.arrayBuffer();
  if(html.length<150_000||html.length>400_000||bytes.byteLength<100_000||bytes.byteLength>500_000)invalid();
  return JSON.stringify({html,posterBytes:bytes.byteLength,posterHash:await sha256(bytes)});
}
const plain=(v:string)=>v.replace(/<!--[\s\S]*?-->/g,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&middot;/gi,'·').replace(/\s+/g,' ').trim();
export function collectKoelsaBundle(input:string){
  let data:{html?:unknown;posterBytes?:unknown;posterHash?:unknown};try{data=JSON.parse(input);}catch{invalid();}
  if(typeof data.html!=='string'||typeof data.posterBytes!=='number'||data.posterHash!==posterHash)invalid();
  const text=plain(data.html),raw=data.html;
  const facts=['일반공지','2026년 창업·벤처기업 지원사업 기업 모집(8.3.(월) ~ 예산 소진 시까지, 선착순)','작성일 2026-07-28','2026년 창업벤처기업 지원 사업 공고문.hwp','붙임1. 지원 신청서','붙임2. 개인정보 수집 및 이용 동의서','붙임3. 지원물품 목록','상생누리사이트 신청방법 안내'];
  for(const fact of facts)if(!text.includes(fact))invalid();
  if(!raw.includes('FILE_000000000041488')||!raw.includes('fn_egov_downFile'))invalid();
  return {parsedPages:2,items:[{sourceId:koelsaSource.id,externalId:'15096',institution:'한국승강기안전공단',group:'공사·공단',title:'2026년 한국승강기안전공단 창업·벤처기업 지원사업 기업 모집',category:'창업·벤처기업 물품지원',audience:'승강기 유관기업 중 창업기업 또는 벤처기업 · 공고문 세부요건 확인',region:null,sourceName:koelsaSource.name,sourceUrl:koelsaSource.url,announcedFrom:'2026-07-28',applicationFrom:'2026-08-03',applicationTo:null,opensAt:new Date('2026-08-03T00:00:00+09:00'),closesAt:null,deadlineLabel:'2026-08-03부터 예산 소진 시까지 · 선착순 · 접수 가능 여부 확인',status:'unknown',ministry:'행정안전부',supportBudget:null,applicationMethod:'상생누리에서 한국승강기안전공단 검색 후 지원사업 신청 · 에어프라이어·전자레인지·토스터기 중 1개 선택'}]};
}
