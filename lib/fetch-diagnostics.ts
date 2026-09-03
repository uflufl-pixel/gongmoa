type Attempt={attempt:number;headersMs:number|null;elapsedMs:number;status:number|null;stage:'response'|'body'|'retry-http'|'complete';error:'timeout'|'abort'|'network'|null};
export class FetchDiagnosticError extends Error {
  readonly statusCode:number|null;
  readonly attempts:Attempt[];
  constructor(attempts:Attempt[]){
    // Only bounded numeric fields and fixed labels: no URL, headers, body or raw error.
    super(('수집 진단 '+attempts.map(a=>`#${a.attempt} ${a.stage} h=${a.headersMs??'-'}ms t=${a.elapsedMs}ms HTTP=${a.status??'-'} ${a.error??''}`).join('; ')).slice(0,300));
    this.name='FetchDiagnosticError';this.attempts=attempts;this.statusCode=attempts.at(-1)?.status??null;
  }
}
// request must create a fresh deadline per attempt; that signal also covers text().
// Keep the existing exception retry, then HTTP retry; never retry body failures.
export async function fetchTextWithDiagnostics(request:()=>Promise<Response>,now:()=>number=()=>performance.now()){
  const attempts:Attempt[]=[];let started=0;
  const elapsed=()=>Math.min(999999,Math.max(0,Math.round(now()-started)));
  const fail=(error:unknown)=>{
    const a=attempts.at(-1)!;a.elapsedMs=elapsed();
    const name=error instanceof Error?error.name:'';
    a.error=name==='TimeoutError'?'timeout':name==='AbortError'?'abort':'network';
    return new FetchDiagnosticError(attempts);
  };
  const run=async()=>{
    started=now();const a:Attempt={attempt:attempts.length+1,headersMs:null,elapsedMs:0,status:null,stage:'response',error:null};attempts.push(a);
    try{const r=await request();a.headersMs=elapsed();a.elapsedMs=a.headersMs;a.status=r.status;return r;}
    catch(error){throw fail(error);}
  };
  let response:Response;
  try{response=await run();}catch{response=await run();}
  if(response.status===408||response.status===429||response.status>=500){
    attempts.at(-1)!.stage='retry-http';
    // Release unused response without allowing cleanup to block the next attempt.
    void response.body?.cancel().catch(()=>{});
    response=await run();
  }
  const last=attempts.at(-1)!;last.stage='body';
  try{const body=await response.text();last.elapsedMs=elapsed();last.stage='complete';return {response,body};}
  catch(error){throw fail(error);}
}
