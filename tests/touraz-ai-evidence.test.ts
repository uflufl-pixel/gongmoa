import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {tourazAiCanonical,tourazAiUrl,verifyTourazAiEvidence} from '../lib/touraz-ai-evidence.ts';
// @ts-expect-error Native Node runner.
import {evidenceHash} from '../lib/namhae-evidence.ts';
// @ts-expect-error Native Node runner.
import {grantAudits,verifyGrantDetail} from '../lib/grant-verification.ts';

const name='★ (공고문 및 가이드라인) AI 기반 지역관광 문제해결 프로젝트(역사문화형) 「AI 배리어프리 부문」.pdf';
const path='/comm/getFile?srvcId=CONTEST_FILE&upperNo=one&fileTy=ATTACH&fileNo=two';
const html=`<h3 class="h3">AI 기반 지역관광 문제해결 프로젝트(역사문화형) - AI 배리어프리</h3><dl><dt>신청기간</dt><dd>2026-09-07(월) 00시부터 ~ 09-16(수) 11시까지</dd></dl><dl><dt>사업설명</dt><dd>혁신기술을 보유한 기업 대상. 온오프믹스 접수</dd></dl><dl><dt>${name}</dt><dd><a href="${path}">다운로드</a></dd></dl>`;

test('AI 관광 공고의 정확한 제목·기간·필수 첨부만 승인한다',()=>{
  assert.equal(tourazAiCanonical(html),tourazAiCanonical(html+'<footer>조회수 2</footer>'));
  for(const changed of [html.replace('11시','18시'),html.replace('혁신기술을 보유한 기업','개인'),html.replace('CONTEST_FILE','OTHER'),html.replace('AI 배리어프리</h3>','결과 발표</h3>')])assert.throws(()=>tourazAiCanonical(changed));
});

test('AI 관광 공식 상세와 PDF 원본 바이트가 모두 맞아야 검증된다',async()=>{
  const pdf=new TextEncoder().encode('%PDF-test');
  const dh=await evidenceHash(new TextEncoder().encode(tourazAiCanonical(html)));
  const fh=await evidenceHash(pdf);
  const mock=(async url=>new Response(url===tourazAiUrl?html:pdf)) as typeof fetch;
  await verifyTourazAiEvidence(dh,mock,fh);
  await assert.rejects(()=>verifyTourazAiEvidence(dh,(async url=>new Response(url===tourazAiUrl?html:'changed')) as typeof fetch,fh));
  const audit=grantAudits.find(a=>a.sourceId==='touraz-kto'&&a.externalId==='1710')!;
  assert.equal((await verifyGrantDetail({...audit,contentHash:'changed'},mock,Date.parse(audit.checkedAt)+1000)).status,'candidate');
  assert.equal(audit.reception?.closesAt,'2026-09-16T02:00:00.000Z');
});
