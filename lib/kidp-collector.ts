export const kidpSource={id:'kidp-finance',institutionId:'public-246',name:'한국디자인진흥원 디자인 금융지원',url:'https://www.kidp.or.kr/index.html?act=view&bbsno=19225&boardno=622&menuno=1202&siteno=16&ztag=rO0ABXQAMzxjYWxsIHR5cGU9ImJvYXJkIiBubz0iNjIyIiBza2luPSJraWRwX2JicyI%2BPC9jYWxsPg%3D%3D'};
const pdfUrl='https://www.kidp.or.kr/usr/upload/board/zboardcommon333/20260904094101150_5038.0.pdf';
const expectedPdfHash='741b824690241949ce9834901bd42c5aff18295428cd9ab2b1572f592ca2ebb8';
function invalid():never{throw new Error('한국디자인진흥원 금융지원 구조 확인 필요');}
function plain(value:string){return value.replace(/<!--[\s\S]*?-->/g,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();}
async function hash(bytes:ArrayBuffer){const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
export async function fetchKidpBundle(fetcher:typeof fetch=fetch){
  const headers={accept:'text/html,application/pdf','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'};
  const [detail,pdf]=await Promise.all([fetcher(kidpSource.url,{headers,redirect:'manual',signal:AbortSignal.timeout(20_000)}),fetcher(pdfUrl,{headers,redirect:'manual',signal:AbortSignal.timeout(20_000)})]);
  if(!detail.ok||!pdf.ok)throw new Error(`KIDP finance HTTP ${detail.status}/${pdf.status}`);
  const html=await detail.text(),bytes=await pdf.arrayBuffer(),view=new Uint8Array(bytes);
  if(html.length<40_000||html.length>100_000||view.length<400_000||view.length>600_000)invalid();
  return JSON.stringify({html,pdfBytes:view.length,pdfMagic:new TextDecoder().decode(view.slice(0,8)),pdfEnd:new TextDecoder().decode(view.slice(-6)),pdfHash:await hash(bytes)});
}
export function collectKidpBundle(input:string,knownIds:string[]=[],now=new Date()){
  let data:Record<string,unknown>;try{data=JSON.parse(input);}catch{invalid();}
  if(typeof data.html!=='string'||data.pdfBytes!==456304||data.pdfMagic!=='%PDF-1.4'||data.pdfEnd!=='%%EOF\n'||data.pdfHash!==expectedPdfHash)invalid();
  const text=plain(data.html);
  for(const fact of ['디자인전문기업 금융지원 희망기업 25차 모집 공고','2026-09-04','2026-09-17','디자인전문기업 및 활용기업','20개사 내외','designfinance@kidp.or.kr'])if(!text.includes(fact))invalid();
  if(!/한국디자인진흥원 공고 제2026[–-]98호/.test(text)||!data.html.includes('bbsno=19225')||!data.html.includes(pdfUrl))invalid();
  const id='19225',start=Date.parse('2026-09-04T00:00:00+09:00'),deadline=Date.parse('2026-09-17T00:00:00+09:00'),ended=Date.parse('2026-09-18T00:00:00+09:00');
  if(now.getTime()>=ended&&!knownIds.includes(id))return {parsedPages:2,items:[]};
  const status=now.getTime()<start?'upcoming':now.getTime()>=ended?'closed':now.getTime()>=deadline?'unknown':'open';
  return {parsedPages:2,items:[{sourceId:kidpSource.id,externalId:id,institution:'한국디자인진흥원',group:'공사·공단',title:'디자인전문기업 금융지원 희망기업 25차 모집',category:'융자·보증 지원(상환 필요)',audience:'산업디자인진흥법상 디자인전문회사 신고기업 또는 KIDP 관련 지원사업 선정 디자인활용기업(벤처·창업·제조기업 등) · 체납 등 제외요건 확인',region:null,sourceName:kidpSource.name,sourceUrl:kidpSource.url,announcedFrom:'2026-09-04',applicationFrom:'2026-09-04',applicationTo:'2026-09-17',opensAt:new Date('2026-09-04T00:00:00+09:00'),closesAt:null,deadlineLabel:'2026-09-17까지 · 마감시각 원문 확인',status,ministry:'산업통상부',supportBudget:null,applicationMethod:'신청서·사업자등록증·재무제표 등 제출서류를 designfinance@kidp.or.kr 이메일 접수 · KIDP 추천 후 기술보증기금 보증심사 및 은행 대출 별도'}]};
}
