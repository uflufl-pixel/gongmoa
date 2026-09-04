import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {ripcEvidenceUrl,ripcAttachment,ripcCanonical,verifyRipcEvidence} from '../lib/ripc-evidence.ts';
// @ts-expect-error Native Node runner.
import {evidenceHash} from '../lib/namhae-evidence.ts';
// @ts-expect-error Native Node runner.
import {grantAudits,verifyGrantDetail} from '../lib/grant-verification.ts';
const title='[강원남부 센터] [강원남부] 2026년 소상공인 IP창출지원 레시피 특허 출원 지원사업 모집 공고';
const body='<p>지원 대상</p><p>지원 내용</p><p>접수 기간</p><p>신청 방법</p><p>제출 서류</p>';
const html=`<table><tr><th>공고명</th><td colspan="3">${title}</td></tr><tr><td><a href='/kms/notice/attachFileDown.do;jsessionid=TEMP?attachSeq=14666'>공고</a><button data-attach-seq="14667">양식</button></td></tr></table><div id="elem" style="display:none">${body}</div>`;

test('RIPC canonical covers core fields and official attachment relation',()=>{
  assert.equal(ripcCanonical(html),ripcCanonical(html+'<footer>조회2</footer>'));
  assert.notEqual(ripcCanonical(html),ripcCanonical(html.replace('지원 대상','지원 대상 수정')));
  for(const changed of [html.replace('14666','14668'),html+`<div id="elem">${body}</div>`,html.replace('신청 방법','다른 방법'),html.replace('레시피','다른')])assert.throws(()=>ripcCanonical(changed));
});

test('RIPC fixed detail and HWP bytes share a deadline and both must match',async()=>{
  const file=new Uint8Array([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1,1]);
  const dh=await evidenceHash(new TextEncoder().encode(ripcCanonical(html))),fh=await evidenceHash(file),urls:string[]=[];
  const mock=(async(url,init)=>{urls.push(String(url));assert.equal(init?.redirect,'manual');return new Response(url===ripcEvidenceUrl?html:file);}) as typeof fetch;
  await verifyRipcEvidence(dh,mock,fh);assert.deepEqual(urls,[ripcEvidenceUrl,ripcAttachment]);
  for(const bad of [file.slice(1),new TextEncoder().encode('<html>error</html>')])await assert.rejects(()=>verifyRipcEvidence(dh,(async url=>new Response(url===ripcEvidenceUrl?html:bad)) as typeof fetch,fh));
});

test('RIPC identity, staleness and evidence failures stay candidate',async()=>{
  const a=grantAudits.find(x=>x.externalId==='PBLN_000000000126087')!,now=Date.parse(a.checkedAt)+1000;
  let calls=0;const failed=(async()=>{calls++;throw Error('timeout');}) as typeof fetch;
  assert.equal((await verifyGrantDetail({...a,title:'changed'},failed,now)).status,'candidate');assert.equal(calls,0);
  assert.equal((await verifyGrantDetail(a,failed,now+8*86400000)).status,'candidate');assert.equal(calls,0);
  assert.equal((await verifyGrantDetail(a,failed,now)).status,'candidate');assert.equal(calls,1);
  assert.match(a.evidence.audience,/관할지역.*미확인/);
});
