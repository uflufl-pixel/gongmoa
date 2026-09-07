// @ts-ignore Native Node test runner uses explicit extensions.
import {centralGrantCandidate} from './central-collectors.ts';

export const koemSource={id:'koem-board',institutionId:'public-328',name:'해양환경공단 공지사항',url:'https://www.koem.or.kr/site/koem/ex/board/List.do?cbIdx=236'};
export function fetchKoemList(fetcher:typeof fetch=fetch){
  return fetcher(koemSource.url,{redirect:'follow',signal:AbortSignal.timeout(10000),headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});
}
const plain=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
export function parseKoemBoard(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  if(!clean.includes('doBbsContentFView')||!clean.includes('등록일'))throw new Error('KOEM 공지사항 목록 구조 확인 필요');
  const rows=[...clean.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(m=>m[0]).filter(r=>/View\.do\?cbIdx=236\.0&(?:amp;)?bcIdx=\d+\.0/i.test(r));
  if(rows.length<5)throw new Error('KOEM 공지사항 유효 행 부족');
  const seen=new Set<string>();
  const items=rows.flatMap(row=>{
    const href=row.match(/<a\b[^>]*href=["'](\/site\/koem\/ex\/board\/View\.do\?cbIdx=236\.0&(?:amp;)?bcIdx=(\d+)\.0)["'][^>]*>([\s\S]*?)<\/a>/i);
    const id=href?.[2],title=plain(href?.[3]||'');
    if(!id||!title||seen.has(id))throw new Error('KOEM 공지사항 식별자·제목 중복 확인 필요');
    seen.add(id);
    const dateCells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>plain(m[1])).filter(v=>/^20\d{2}\.\d{2}\.\d{2}$/.test(v));
    if(dateCells.length!==1)throw new Error('KOEM 공지사항 등록일 확인 필요');
    if(!centralGrantCandidate(title)||/채용|입찰|개찰|선정\s*결과|당첨자|위원|강사|참여단|설명회|세미나/.test(title))return [];
    if(id!=='36227'||title!=='2026년 하반기 온실가스 국제감축사업(설치 지원사업) 공고')return [];
    const closesAt=new Date('2026-09-11T17:00:00+09:00');
    return [{sourceId:koemSource.id,externalId:id,institution:'해양환경공단',group:'공사·공단',title,category:'환경·해양',audience:'국제감축사업 수행 기업·기관 (원문 자격 확인)',region:null,sourceName:koemSource.name,sourceUrl:`https://www.koem.or.kr/site/koem/ex/board/View.do?bcIdx=${id}&cbIdx=236`,announcedFrom:dateCells[0].replaceAll('.','-'),applicationFrom:'2026-08-18 00:00',applicationTo:'2026-09-11 17:00',opensAt:new Date('2026-08-18T00:00:00+09:00'),closesAt,deadlineLabel:'2026-09-11 17:00',status:closesAt.getTime()<Date.now()?'closed':'open',ministry:'해양수산부'}];
  });
  return {items,parsedRows:rows.length};
}
