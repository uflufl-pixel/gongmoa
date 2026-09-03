import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {fetchBojoChanges} from '../lib/bojo-changes.ts';

const now=new Date('2026-09-03T01:00:00Z');
function payload(page:number,total:number){return {response:{header:{resultCode:'00'},body:{pageNo:page,numOfRows:500,totalCount:total,items:{item:Array.from({length:Math.min(500,Math.max(0,total-(page-1)*500))},()=>({PBLANC_NM:'지원사업'}))}}}};}
test('BOJO delta reads both dates and every page using 500-row pages',async()=>{
  const urls:URL[]=[];
  const fetcher:typeof fetch=async input=>{const u=new URL(String(input));urls.push(u);return Response.json(payload(Number(u.searchParams.get('pageNo')),501));};
  const result=await fetchBojoChanges('test-key',{now,fetcher});
  assert.equal(result.ok,true);assert.equal(result.rows.length,1002);
  assert.deepEqual(result.dates,['20260903','20260902']);assert.equal(urls.length,4);
  assert.ok(urls.every(u=>u.searchParams.get('numOfRows')==='500'));
});
test('BOJO failure is contained, cancels sibling and never leaks credential or partial rows',async()=>{
  let siblingAborted=false;
  const fetcher:typeof fetch=async(input,init)=>{
    if(String(input).includes('pblanc_updt_dt=20260903'))return new Response('unavailable',{status:503});
    return await new Promise<Response>((_,reject)=>init!.signal!.addEventListener('abort',()=>{siblingAborted=true;reject(new Error('secret-key'));},{once:true}));
  };
  const [result,other]=await Promise.all([fetchBojoChanges('secret-key',{now,fetcher}),Promise.resolve('other source succeeded')]);
  assert.equal(other,'other source succeeded');assert.equal(result.ok,false);assert.equal(siblingAborted,true);assert.deepEqual(result.rows,[]);
  assert.ok(!JSON.stringify(result).includes('secret-key'));
});
test('BOJO entire multi-page operation shares one abort deadline',async()=>{
  const signals:AbortSignal[]=[];
  const fetcher:typeof fetch=async(input,init)=>{
    const signal=init!.signal!;signals.push(signal);
    if(new URL(String(input)).searchParams.get('pageNo')==='1')return Response.json(payload(1,501));
    return await new Promise<Response>((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('timeout')),{once:true}));
  };
  const result=await fetchBojoChanges('key',{now,fetcher,budgetMs:30});
  assert.equal(result.ok,false);assert.deepEqual(result.rows,[]);
  assert.equal(new Set(signals).size,1);assert.ok(signals.every(s=>s.aborted));
});
test('BOJO malformed JSON and incomplete pages are explicit failures',async()=>{
  assert.equal((await fetchBojoChanges('key',{now,fetcher:async()=>new Response('<html>error</html>')})).ok,false);
  const bad=payload(1,501);bad.response.body.items.item=[];
  assert.equal((await fetchBojoChanges('key',{now,fetcher:async()=>Response.json(bad)})).ok,false);
});
