import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {ripcUrl,ripcAttachment,ripcCanonical,verifyRipcEvidence} from '../lib/ripc-evidence.ts';
// @ts-expect-error Native Node runner.
import {evidenceHash} from '../lib/namhae-evidence.ts';
// @ts-expect-error Native Node runner.
import {grantAudits,verifyGrantDetail} from '../lib/grant-verification.ts';
const row=(label:string,value='내용')=>`<li><span class="s_title">${label}</span><div>${value}</div></li>`;
const title='[강원] 남부권 2026년 소상공인 IP창출지원 레시피 특허 출원 지원사업 모집 공고';
const html=`<h2 class="title">${title}</h2>`+['소관부처·지자체','사업수행기관','신청기간','사업개요','사업신청 방법'].map(x=>row(x)).join('')+`<a href="${new URL(ripcAttachment).pathname+new URL(ripcAttachment).search}">첨부</a>`;

test('RIPC canonical covers core fields and official attachment relation',()=>{
  assert.equal(ripcCanonical(html),ripcCanonical(html+'<footer>조회2</footer>'));
  assert.notEqual(ripcCanonical(html),ripcCanonical(html.replace('내용','수정')));
  for(const changed of [html.replace('771753','771754'),html+row('사업개요'),html.replace('신청기간','다른기간'),html.replace('레시피','다른')])assert.throws(()=>ripcCanonical(changed));
});

test('RIPC fixed detail and HWP bytes share a deadline and both must match',async()=>{
  const file=new Uint8Array([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1,1]);
  const dh=await evidenceHash(new TextEncoder().encode(ripcCanonical(html))),fh=await evidenceHash(file),urls:string[]=[];
  const mock=(async(url,init)=>{urls.push(String(url));assert.equal(init?.redirect,'manual');return new Response(url===ripcUrl?html:file);}) as typeof fetch;
  await verifyRipcEvidence(dh,mock,fh);assert.deepEqual(urls,[ripcUrl,ripcAttachment]);
  for(const bad of [file.slice(1),new TextEncoder().encode('<html>error</html>')])await assert.rejects(()=>verifyRipcEvidence(dh,(async url=>new Response(url===ripcUrl?html:bad)) as typeof fetch,fh));
});

test('RIPC identity, staleness and evidence failures stay candidate',async()=>{
  const a=grantAudits.find(x=>x.externalId==='PBLN_000000000126087')!,now=Date.parse(a.checkedAt)+1000;
  let calls=0;const failed=(async()=>{calls++;throw Error('timeout');}) as typeof fetch;
  assert.equal((await verifyGrantDetail({...a,title:'changed'},failed,now)).status,'candidate');assert.equal(calls,0);
  assert.equal((await verifyGrantDetail(a,failed,now+8*86400000)).status,'candidate');assert.equal(calls,0);
  assert.equal((await verifyGrantDetail(a,failed,now)).status,'candidate');assert.equal(calls,1);
  assert.match(a.evidence.audience,/관할지역.*미확인/);
});
