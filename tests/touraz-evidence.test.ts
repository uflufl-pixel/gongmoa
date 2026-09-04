import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {tourazUrl,tourazCanonical,verifyTourazEvidence} from '../lib/touraz-evidence.ts';
// @ts-expect-error Native Node runner.
import {evidenceHash} from '../lib/namhae-evidence.ts';
// @ts-expect-error Native Node runner.
import {grantAudits,verifyGrantDetail} from '../lib/grant-verification.ts';
const title='<h3 class="h3">2027 무장애 관광환경 조성 사업 공모 실시</h3>';
const dl=(k:string,v:string)=>`<dl><dt>${k}</dt><dd>${v}</dd></dl>`;
const description='광역 및 기초자치단체 대상이며 공문과 우편 두 가지 모두 필요';
const path='/comm/getFile?srvcId=CONTEST_FILE&upperNo=random&fileTy=ATTACH&fileNo=random';
const file=dl('★붙임1. 2027 무장애 관광환경 조성 사업 공모안내서.pdf',`<a href="${path}">안내서</a>`);
const html=title+dl('신청기간','2026-09-07 ~ 09-30')+dl('사업설명',description)+file;

test('Touraz canonical covers dates, description and official files but not page chrome',()=>{
  assert.equal(tourazCanonical(html),tourazCanonical(html+'<footer>조회수2</footer>'));
  assert.equal(tourazCanonical(html),tourazCanonical(html.replaceAll('random','changed-token')));
  assert.notEqual(tourazCanonical(html),tourazCanonical(html.replace('09-30','09-29')));
  for(const changed of [html.replace('CONTEST_FILE','OTHER'),html+dl('사업설명',description),html.replace('광역 및 기초자치단체','기업'),html.replace('공모 실시','선정 결과')])assert.throws(()=>tourazCanonical(changed));
});

test('Touraz fixed detail and PDF bytes must both match',async()=>{
  const pdf=new TextEncoder().encode('%PDF-test'),dh=await evidenceHash(new TextEncoder().encode(tourazCanonical(html))),fh=await evidenceHash(pdf),urls:string[]=[];
  const mock=(async(url,init)=>{urls.push(String(url));assert.equal(init?.redirect,'manual');return new Response(url===tourazUrl?html:pdf);}) as typeof fetch;
  await verifyTourazEvidence(dh,mock,fh);assert.deepEqual(urls,[tourazUrl,new URL(path,tourazUrl).href]);
  for(const bad of [new TextEncoder().encode('HTML'),new TextEncoder().encode('%PDF-changed')])await assert.rejects(()=>verifyTourazEvidence(dh,(async url=>new Response(url===tourazUrl?html:bad)) as typeof fetch,fh));
});

test('Touraz identity, staleness and evidence failures stay candidate',async()=>{
  const a=grantAudits.find(x=>x.sourceId==='touraz-kto'&&x.externalId==='1709')!,now=Date.parse(a.checkedAt)+1000;
  let calls=0;const failed=(async()=>{calls++;throw Error('timeout');}) as typeof fetch;
  assert.equal((await verifyGrantDetail({...a,contentHash:'changed'},failed,now)).status,'candidate');assert.equal(calls,0);
  assert.equal((await verifyGrantDetail(a,failed,now+8*86400000)).status,'candidate');assert.equal(calls,0);
  assert.equal((await verifyGrantDetail(a,failed,now)).status,'candidate');assert.equal(calls,1);
  assert.equal(a.reception?.closesAt,null);assert.equal(a.reception?.deadlinePrecision,'date');
});
