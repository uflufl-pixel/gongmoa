import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {tourazChongqingCanonical,tourazChongqingUrl,verifyTourazChongqingEvidence} from '../lib/touraz-chongqing-evidence.ts';
// @ts-expect-error Native Node runner.
import {evidenceHash} from '../lib/namhae-evidence.ts';
// @ts-expect-error Native Node runner.
import {grantAudits,verifyGrantDetail} from '../lib/grant-verification.ts';

const name='[청두지사] 충칭 한국 프리미엄 소비재 판촉전 연계 K-관광 홍보관 참가모집안.pdf';
const path='/comm/getFile?srvcId=CONTEST_FILE&upperNo=one&fileTy=ATTACH&fileNo=two';
const html=`<h3 class="h3">충칭 한국 소비재 판촉전 연계 'K-관광 홍보관' 참가안내</h3><dl><dt>신청기간</dt><dd>2026-09-08(화) 00시부터 ~ 09-23(수) 18시까지</dd></dl><dl><dt>사업설명</dt><dd>국내 관광기업 모집, 1~3개사 지원</dd></dl><dl><dt>${name}</dt><dd><a href="${path}">다운로드</a></dd></dl>`;

test('충칭 홍보관은 정확한 참가모집 구조만 승인한다',()=>{
  assert.equal(tourazChongqingCanonical(html),tourazChongqingCanonical(html+'<footer>조회수 2</footer>'));
  for(const changed of [html.replace('18시','11시'),html.replace('국내 관광기업','일반 관광객'),html.replace('CONTEST_FILE','OTHER'),html.replace('참가안내</h3>','결과 발표</h3>')])assert.throws(()=>tourazChongqingCanonical(changed));
});

test('충칭 공식 상세와 PDF가 모두 일치해야 검증된다',async()=>{
  const pdf=new TextEncoder().encode('%PDF-test');
  const dh=await evidenceHash(new TextEncoder().encode(tourazChongqingCanonical(html)));
  const fh=await evidenceHash(pdf);
  const mock=(async url=>new Response(url===tourazChongqingUrl?html:pdf)) as typeof fetch;
  await verifyTourazChongqingEvidence(dh,mock,fh);
  await assert.rejects(()=>verifyTourazChongqingEvidence(dh,(async url=>new Response(url===tourazChongqingUrl?html:'changed')) as typeof fetch,fh));
  const audit=grantAudits.find(a=>a.sourceId==='touraz-kto'&&a.externalId==='1711')!;
  assert.equal((await verifyGrantDetail({...audit,contentHash:'changed'},mock,Date.parse(audit.checkedAt)+1000)).status,'candidate');
  assert.equal(audit.reception?.closesAt,'2026-09-23T09:00:00.000Z');
});
