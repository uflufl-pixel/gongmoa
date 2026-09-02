import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {fetchMolitList,molitListUrl} from '../lib/molit-fetch.ts';
test('MOLIT retries same URL once with only its issued session cookie',async()=>{
  let calls=0;
  const mock:typeof fetch=async(url,init)=>{
    assert.equal(url,molitListUrl);assert.equal(init?.redirect,'manual');calls++;
    if(calls===1)return new Response(null,{status:307,headers:{location:molitListUrl,'set-cookie':'TMOSHCooKie=test123; Path=/; Secure'}});
    assert.equal(new Headers(init?.headers).get('cookie'),'TMOSHCooKie=test123');return new Response('ok');
  };
  assert.equal((await fetchMolitList(mock)).status,200);assert.equal(calls,2);
});
test('MOLIT does not forward cookies across URLs or retry forever',async()=>{
  for(const location of [molitListUrl,'https://example.com/','https://www.molit.go.kr/other']){
    let calls=0;
    const mock:typeof fetch=async()=>{calls++;return new Response(null,{status:307,headers:{location,'set-cookie':'TMOSHCooKie=test123'}});};
    assert.equal((await fetchMolitList(mock)).status,307);assert.equal(calls,location===molitListUrl?2:1);
  }
});
