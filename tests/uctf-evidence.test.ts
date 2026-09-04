import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {uctfTourazUrl,uctfNoticePdf,uctfCanonical,verifyUctfEvidence} from '../lib/uctf-evidence.ts';
// @ts-expect-error Native Node runner.
import {evidenceHash} from '../lib/namhae-evidence.ts';
// @ts-expect-error Native Node runner.
import {grantAudits,verifyGrantDetail} from '../lib/grant-verification.ts';
const title='<h3 class="h3">2026 울산 관광 인재 인턴십 지원사업 참여기업 모집</h3>';
const dl=(k:string,v:string)=>`<dl><dt>${k}</dt><dd>${v}</dd></dl>`;
const html='<input name="pssrpSeq" value="1426">'+title+dl('신청기간','2026-02-25 09시부터 ~ 10-30 18시까지')+dl('신청대상','기업')+dl('지원분야(선정수)','10')+dl('사업설명','재단법인 울산문화관광재단 대표이사 2026 울산 관광 인재 인턴십 지원사업')+dl('제출서류','관광사업 증명서(해당시)');

test('UCTF canonical covers identity and core fields but ignores page chrome',()=>{
  assert.equal(uctfCanonical(html),uctfCanonical(html+'<footer>조회수 3</footer>'));
  assert.notEqual(uctfCanonical(html),uctfCanonical(html.replace('18시','17시')));
  for(const changed of [html.replace('1426','1427'),html.replace('신청대상','대상'),html.replace('기업</dd>','개인</dd>'),html.replace('참여기업 모집','선정 결과')])assert.throws(()=>uctfCanonical(changed));
});

test('UCTF detail and fixed official PDF must both match',async()=>{
  const pdf=new TextEncoder().encode('%PDF-test'),dh=await evidenceHash(new TextEncoder().encode(uctfCanonical(html))),ph=await evidenceHash(pdf),urls:string[]=[];
  const mock=(async(url,init)=>{urls.push(String(url));assert.equal(init?.redirect,'manual');return new Response(url===uctfTourazUrl?html:pdf);}) as typeof fetch;
  await verifyUctfEvidence(dh,mock,ph);assert.deepEqual(urls,[uctfTourazUrl,uctfNoticePdf]);
  await assert.rejects(()=>verifyUctfEvidence(dh,(async url=>new Response(url===uctfTourazUrl?html:new TextEncoder().encode('HTML'))) as typeof fetch,ph));
});

test('UCTF identity, staleness and evidence failures stay candidate',async()=>{
  const a=grantAudits.find(x=>x.sourceId==='touraz-kto'&&x.externalId==='1426')!,now=Date.parse(a.checkedAt)+1000;
  let calls=0;const failed=(async()=>{calls++;throw Error('timeout');}) as typeof fetch;
  assert.equal((await verifyGrantDetail({...a,contentHash:'changed'},failed,now)).status,'candidate');assert.equal(calls,0);
  assert.equal((await verifyGrantDetail(a,failed,now+8*86400000)).status,'candidate');assert.equal(calls,0);
  assert.equal((await verifyGrantDetail(a,failed,now)).status,'candidate');assert.equal(calls,1);
  assert.equal(a.reception?.closesAt,'2026-10-30T09:00:00.000Z');
});
