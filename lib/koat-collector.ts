// @ts-ignore Native Node test runner uses explicit extensions.
import {centralGrantCandidate} from './central-collectors.ts';
export const koatSource={id:'koat-board',institutionId:'public-164',name:'한국농업기술진흥원 사업공고',url:'https://www.koat.or.kr/board/business/list.do'};
export function fetchKoatList(fetcher:typeof fetch=fetch){
  return fetcher(koatSource.url,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});
}
function plain(s:string){return s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();}
export function parseKoatBoard(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const table=[...clean.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1]).find(t=>t.includes('등록일')&&t.includes('textCut'));
  if(!table)throw new Error('KOAT 사업공고 목록 구조 확인 필요');
  const body=table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1];
  const rows=[...(body||'').matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(m=>m[0]);
  if(rows.length<3)throw new Error('KOAT 사업공고 행 부족');
  const seen=new Set<string>();
  const items=rows.flatMap(row=>{
    const tag=row.match(/^<tr\b[^>]*>/i)?.[0]||'';
    const action=tag.match(/\bonclick\s*=\s*(["'])(.*?)\1/i)?.[2]||'';
    const id=/^postLink\(([1-9]\d*)\);?$/.exec(action)?.[1];
    const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
    const cell=row.match(/<td\b[^>]*class=["'][^"']*\btextCut\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/i)?.[1]||'';
    const anchor=cell.match(/<a\b([^>]*)>([\s\S]*?)<\/a>/i);
    const linkAction=anchor?.[1].match(/\bonclick\s*=\s*(["'])(.*?)\1/i)?.[2];
    const title=plain(anchor?.[2]||''),posted=plain(cells[4]?.[1]||'');
    const date=new Date(posted+'T00:00:00Z');
    if(!id||linkAction!==`postLink(${id})`||cells.length!==6||!title||!/^\d{4}-\d{2}-\d{2}$/.test(posted)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==posted)throw new Error('KOAT 공고 식별자·제목·게시일 확인 필요');
    if(seen.has(id))return [];seen.add(id);
    if(!centralGrantCandidate(title)||/인턴|심사원|양성교육|설명회|세미나|수요\s*조사/.test(title))return [];
    return [{sourceId:koatSource.id,externalId:id,institution:'한국농업기술진흥원',group:'공사·공단',title,category:'농업·농식품',audience:'원문 지원자격 확인',region:null,sourceName:koatSource.name,sourceUrl:`https://www.koat.or.kr/board/business/${id}/view.do`,announcedFrom:posted,applicationFrom:null,applicationTo:null,opensAt:null,closesAt:null,deadlineLabel:'접수기간 원문 확인',status:'open',ministry:'농촌진흥청'}];
  });
  return {items,parsedRows:rows.length};
}
