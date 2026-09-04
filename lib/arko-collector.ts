// @ts-ignore Native Node test runner uses explicit extensions.
import {centralGrantCandidate} from './central-collectors.ts';
export const arkoSource={id:'arko-board',institutionId:'public-188',name:'한국문화예술위원회 사업공모',url:'https://arko.or.kr/board/list/4013?bid=463&sf_icon_category=cw00000019'};
export function fetchArkoList(fetcher:typeof fetch=fetch){return fetcher(arkoSource.url,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});}
function plain(s:string){return s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function invalid():never{throw new Error('아르코 사업공모 목록 구조 확인 필요');}
export function arkoCandidate(title:string){return centralGrantCandidate(title)||(/해외레지던시.*참가지원/.test(title)&&centralGrantCandidate(title+' 지원사업'));}
export function parseArkoBoard(html:string,knownIds:string[]=[]){
  if(html.length>1_000_000)invalid();
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const lists=[...clean.matchAll(/<ul\b[^>]*class="cardBdList"[^>]*>([\s\S]*?)<\/ul>/g)];
  if(lists.length<1||lists.length>2)invalid();
  const rows=lists.flatMap(list=>[...list[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)]);
  if(rows.length<1||rows.length>20)invalid();
  const seen=new Map<string,string>(),known=new Set(knownIds);
  const items=rows.flatMap(row=>{
    const body=row[1],href=body.match(/<a\b[^>]*href="([^"]+)"/)?.[1];
    if(!href)invalid();
    let url:URL;try{url=new URL(href.replace(/&amp;/g,'&'));}catch{invalid();}
    const id=url.searchParams.get('docid');
    if(url.origin!=='https://artnuri.or.kr'||url.pathname!=='/crawler/info/view.do'||url.username||url.password||
      !id||!/^CRL[1-9]\d*$/.test(id)||url.searchParams.getAll('docid').length!==1||url.searchParams.get('source')!=='한국문화예술위원회')invalid();
    const title=plain(body.match(/<span class="tit">([\s\S]*?)<\/span>/)?.[1]||'');
    const date=plain(body.match(/<span class="date">([\s\S]*?)<\/span>/)?.[1]||'');
    const state=plain(body.match(/<span class="state(?: gray)?\s*">([\s\S]*?)<\/span>/)?.[1]||'');
    if(!title||!['진행중','종료'].includes(state))invalid();
    const dates=/^(\d{4}\.\d{2}\.\d{2}) ~ (\d{4}\.\d{2}\.\d{2})$/.exec(date);
    if(!dates)invalid();
    const [from,to]=dates.slice(1).map(s=>s.replaceAll('.','-'));
    for(const day of [from,to]){const d=new Date(day+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==day)invalid();}
    if(from>to)invalid();
    const signature=JSON.stringify([title,date,state]);
    if(seen.has(id)){if(seen.get(id)!==signature)invalid();return [];}
    seen.set(id,signature);
    if(!known.has(id)&&(!arkoCandidate(title)||state==='종료'))return [];
    // Official list and linked detail currently disagree on dates. Do not select
    // either source's application deadline until the underlying notice is audited.
    return [{sourceId:arkoSource.id,externalId:id,institution:'한국문화예술위원회',group:'공사·공단',title,category:'문화·예술',audience:'원문 지원자격 확인',region:null,sourceName:arkoSource.name,
      sourceUrl:`https://artnuri.or.kr/crawler/info/view.do?seNo=001&key=2301170002&docid=${id}`,
      applicationFrom:null,applicationTo:null,opensAt:null,closesAt:null,deadlineLabel:'접수기간 원문 확인',status:state==='종료'?'closed':'unknown',ministry:'문화체육관광부'}];
  });
  return {items,parsedRows:rows.length};
}
