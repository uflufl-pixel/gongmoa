// Fixed official paths only. This diagnostic is not a proxy or a notice importer.
export const mndProbePaths=[
  {id:'notice-rss-50',url:'https://www.mnd.go.kr/bbs/mnd/11066/rssList.do?row=50'},
  {id:'notice-rss-10',url:'https://www.mnd.go.kr/bbs/mnd/11066/rssList.do?row=10'},
  {id:'notice-html',url:'https://www.mnd.go.kr/mnd/154/subview.do'},
  {id:'announcement-rss',url:'https://www.mnd.go.kr/bbs/mnd/26390/rssList.do?row=50'},
] as const;
const limit=512_000;
export async function probeMndPaths(fetcher:typeof fetch=fetch,now:()=>number=()=>performance.now()){
  const signal=AbortSignal.timeout(10000);
  return Promise.all(mndProbePaths.map(async path=>{
    const start=now();let headersMs:number|null=null,status:number|null=null,bytes=0;
    let stage:'response'|'body'|'complete'='response';
    const elapsed=()=>Math.max(0,Math.round(now()-start));
    try{
      const response=await fetcher(path.url,{signal,redirect:'manual',headers:{accept:path.id==='notice-html'?'text/html':'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.5','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});
      headersMs=elapsed();status=response.status;stage='body';
      const reader=response.body?.getReader();const decoder=new TextDecoder();let body='';
      if(reader)try{
        while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;
          if(bytes>limit){void reader.cancel().catch(()=>{});return {id:path.id,status,headersMs,elapsedMs:elapsed(),stage,bytes,error:'body_limit',rssItems:null,detailPathMarkers:null};}
          body+=decoder.decode(value,{stream:true});
        }
        body+=decoder.decode();
      }finally{reader.releaseLock();}
      stage='complete';
      return {id:path.id,status,headersMs,elapsedMs:elapsed(),stage,bytes,error:null,
        rssItems:/<rss\b/.test(body)?(body.match(/<item>/g)||[]).length:null,
        detailPathMarkers:new Set(body.match(/\/bbs\/mnd\/(?:11066|26390)\/I_\d+\/artclView\.do/g)||[]).size};
    }catch(error){
      const name=error instanceof Error?error.name:'';
      return {id:path.id,status,headersMs,elapsedMs:elapsed(),stage,bytes,error:name==='TimeoutError'?'timeout':name==='AbortError'?'abort':'network',rssItems:null,detailPathMarkers:null};
    }
  }));
}
export async function handleMndProbe(request:Request,fetcher:typeof fetch=fetch){
  if(request.method!=='POST'||new URL(request.url).search)return Response.json({error:'POST without parameters required'},{status:400});
  return Response.json({diagnosticOnly:true,items:await probeMndPaths(fetcher),checkedAt:new Date().toISOString()},{headers:{'cache-control':'no-store'}});
}
