import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {fetchTextWithDiagnostics,FetchDiagnosticError} from '../lib/fetch-diagnostics.ts';
test('diagnostic retries request exception once, then HTTP once at most',async()=>{
  for(const statuses of [[0,200],[0,503,200],[503,503],[403],[200]]){
    let calls=0;
    const r=await fetchTextWithDiagnostics(async()=>{const status=statuses[calls++];if(status===0)throw new Error('private');return new Response('ok',{status});});
    assert.equal(calls,statuses.length);assert.equal(r.response.status,statuses.at(-1));assert.equal(r.body,'ok');
  }
});
test('response failures retain per-attempt timing without secrets and stop after two exceptions',async()=>{
  let calls=0,t=0;
  await assert.rejects(fetchTextWithDiagnostics(async()=>{calls++;t+=10000;throw new DOMException('https://secret.test/?key=secret','TimeoutError');},()=>t),(e:unknown)=>{
    assert.ok(e instanceof FetchDiagnosticError);assert.equal(e.statusCode,null);assert.equal(e.attempts.length,2);
    assert.deepEqual(e.attempts.map(a=>[a.stage,a.headersMs,a.elapsedMs,a.status,a.error]),[['response',null,10000,null,'timeout'],['response',null,10000,null,'timeout']]);
    assert.ok(e.message.length<=300);assert.ok(!e.message.includes('secret'));return true;
  });assert.equal(calls,2);
});
test('body failure is not retried and preserves received status and header timing',async()=>{
  let calls=0,t=0;
  await assert.rejects(fetchTextWithDiagnostics(async()=>{
    calls++;t+=120;const response=new Response('private',{status:200});
    response.text=async()=>{t+=9880;throw new DOMException('sensitive body','TimeoutError');};return response;
  },()=>t),(e:unknown)=>{
    assert.ok(e instanceof FetchDiagnosticError);assert.equal(e.statusCode,200);assert.equal(e.attempts[0].stage,'body');assert.equal(e.attempts[0].headersMs,120);assert.equal(e.attempts[0].elapsedMs,10000);assert.ok(!e.message.includes('sensitive'));return true;
  });assert.equal(calls,1);
});
test('third-attempt body failure distinguishes earlier exception and HTTP retry',async()=>{
  let calls=0;
  await assert.rejects(fetchTextWithDiagnostics(async()=>{
    calls++;if(calls===1)throw new Error('private');if(calls===2)return new Response('unused',{status:503});
    const r=new Response('private',{status:200});r.text=async()=>{throw new DOMException('private','AbortError');};return r;
  }),(e:unknown)=>{
    assert.ok(e instanceof FetchDiagnosticError);assert.deepEqual(e.attempts.map(a=>a.stage),['response','retry-http','body']);assert.equal(e.attempts[2].error,'abort');assert.ok(e.message.length<=300);return true;
  });assert.equal(calls,3);
});
