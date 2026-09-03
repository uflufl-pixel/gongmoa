import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {probeMndPaths,mndProbePaths,handleMndProbe} from '../lib/mnd-probe.ts';
test('MND probe uses four fixed paths, shared deadline and no redirects',async()=>{
  const urls:string[]=[];const signals=new Set();
  const items=await probeMndPaths(async(url,init)=>{urls.push(String(url));signals.add(init?.signal);assert.equal(init?.redirect,'manual');return new Response('<rss><item></item><item></item></rss>');});
  assert.deepEqual(urls,mndProbePaths.map(x=>x.url));assert.equal(signals.size,1);assert.equal(items.length,4);assert.ok(items.every(x=>x.rssItems===2&&x.stage==='complete'));
});
test('MND probe separates response and body failures without logging private content',async()=>{
  const items=await probeMndPaths(async url=>{
    if(String(url).includes('row=50'))throw new DOMException('secret-key','TimeoutError');
    if(String(url).includes('row=10'))return new Response(new ReadableStream({start(c){c.error(new Error('secret-body'));}}));
    return new Response(null,{status:307,headers:{location:'https://secret.test/'}});
  });
  assert.equal(items[0].stage,'response');assert.equal(items[0].status,null);assert.equal(items[1].stage,'body');assert.equal(items[1].status,200);assert.equal(items[2].status,307);assert.ok(!JSON.stringify(items).includes('secret'));
});
test('MND probe caps bodies and rejects caller supplied URLs without fetching',async()=>{
  const items=await probeMndPaths(async()=>new Response('x'.repeat(512001)));assert.ok(items.every(x=>x.error==='body_limit'));
  let calls=0;const mock:typeof fetch=async()=>{calls++;return new Response('ok');};
  assert.equal((await handleMndProbe(new Request('https://app.test/api/mnd-probe?url=https://evil.test',{method:'POST'}),mock)).status,400);assert.equal(calls,0);
  const response=await handleMndProbe(new Request('https://app.test/api/mnd-probe',{method:'POST'}),mock);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(calls,4);assert.equal((await response.json() as {diagnosticOnly:boolean}).diagnosticOnly,true);
});
