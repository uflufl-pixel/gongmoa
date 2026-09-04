import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {namhaeUrl,namhaeAttachment,namhaeCanonical,evidenceHash,readEvidenceBytes,verifyNamhaeEvidence} from '../lib/namhae-evidence.ts';
// @ts-expect-error Native Node runner.
import {grantAudits,verifyGrantDetail} from '../lib/grant-verification.ts';
const row=(label:string,value:string)=>`<li><span class="s_title">${label}</span><div>${value}</div></li>`;
const html='<h2 class="title">2026년 남해군 면 지역 마을가게 창업 지원사업 참여자 모집 공고</h2>'+['소관부처·지자체','사업수행기관','신청기간','사업개요','사업신청 방법'].map(x=>row(x,'내용')).join('')+`<a href="${new URL(namhaeAttachment).pathname+new URL(namhaeAttachment).search}">첨부</a>`;
test('canonical covers eligibility, method and attachment relationship but not page chrome',()=>{
  assert.equal(namhaeCanonical(html),namhaeCanonical(html+'<footer>접속수2</footer>'));
  assert.notEqual(namhaeCanonical(html),namhaeCanonical(html.replace('내용','수정')));
  for(const changed of [html.replace('771537','771538'),html+row('사업개요','중복'),html.replace('신청기간','다른기간'),html.replace('마을가게','다른사업')])assert.throws(()=>namhaeCanonical(changed));
});
test('two fixed URLs share a deadline and validate actual bytes',async()=>{
  const file=new Uint8Array([80,75,3,4,5]),dh=await evidenceHash(new TextEncoder().encode(namhaeCanonical(html))),fh=await evidenceHash(file);
  const signals:AbortSignal[]=[];const urls:string[]=[];
  const mock=(async(url,init)=>{urls.push(String(url));signals.push(init!.signal!);assert.equal(init?.redirect,'manual');return new Response(url===namhaeUrl?html:file);}) as typeof fetch;
  await verifyNamhaeEvidence(dh,mock,fh);assert.deepEqual(urls,[namhaeUrl,namhaeAttachment]);assert.equal(signals[0],signals[1]);
  for(const body of [new Uint8Array([80,75,3,4,6]),new TextEncoder().encode('<html>error</html>')])await assert.rejects(()=>verifyNamhaeEvidence(dh,(async url=>new Response(url===namhaeUrl?html:body)) as typeof fetch,fh));
  await assert.rejects(()=>verifyNamhaeEvidence(dh,(async()=>new Response('redirect',{status:302})) as typeof fetch,fh));
});
test('stream cap is enforced without content-length and reader cancels',async()=>{
  let cancelled=false;const stream=new ReadableStream<Uint8Array>({pull(c){c.enqueue(new Uint8Array(6));},cancel(){cancelled=true;}});
  await assert.rejects(()=>readEvidenceBytes(new Response(stream),10));assert.equal(cancelled,true);
});
test('stale/changed identities do not fetch; failed attachment cannot qualify',async()=>{
  const a=grantAudits.find(x=>x.externalId==='PBLN_000000000126034')!,now=Date.parse(a.checkedAt)+1000;
  let calls=0;const failed=(async()=>{calls++;throw Error('timeout');}) as typeof fetch;
  assert.equal((await verifyGrantDetail({...a,contentHash:'changed'},failed,now)).status,'candidate');assert.equal(calls,0);
  assert.equal((await verifyGrantDetail(a,failed,now+8*86400000)).status,'candidate');assert.equal(calls,0);
  assert.equal((await verifyGrantDetail(a,failed,now)).status,'candidate');assert.equal(calls,1);
});
