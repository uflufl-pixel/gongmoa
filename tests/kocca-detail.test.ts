import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {parseKoccaDetail,mergeKoccaDetail} from '../lib/kocca-detail.ts';
const html=(period='ㅇ 신청기간: 2026. 8. 31.(월) ~ 9. 21.(월), 11:00',end='26.09.21')=>`<div class="board_title">공동관 참가기업 모집공고</div><li><strong>접수시작일</strong><span>26.08.31</span></li><li><strong>접수마감일</strong><span>${end}</span></li><h4>행사개요</h4><td>2027. 1. 19. ~ 1. 21.</td><h4>지원대상 및 신청자격</h4><td>국내 콘텐츠기업</td><h4>신청방법</h4><td>${period}<br/>온라인 접수, 문의시간 18:00</td>`;
test('KOCCA uses labeled application dates, cutoff and target, not event/contact times',()=>{
  const d=parseKoccaDetail(html());
  assert.equal(d.applicationFrom,'2026-08-31');assert.equal(d.applicationTo,'2026-09-21');assert.equal(d.closesAt,'2026-09-21T02:00:00.000Z');assert.equal(d.audience,'국내 콘텐츠기업');
  const n={audience:'기업',status:'open'};
  assert.equal(mergeKoccaDetail(n,d,0,Date.parse('2026-09-21T02:01Z')).status,'closed');
});
test('KOCCA supports explicit Korean afternoon and 24-hour notation',()=>{
  for(const t of ['오후 14:00','오후 2:00'])assert.equal(parseKoccaDetail(html('신청기간: 2026. 8. 31.(월) ~ 9. 21.(월), '+t)).closesAt,'2026-09-21T05:00:00.000Z');
});
test('KOCCA continuous recruitment overrides placeholder end of year',()=>{
  const d=parseKoccaDetail(html('접수기간: 2026. 8. 31.(월) ~ 상시모집','26.12.31'));
  assert.equal(d.applicationTo,null);assert.equal(d.closesAt,null);assert.match(d.applicationPeriod,/상시모집/);
});
test('KOCCA rejects block pages, invalid dates, ambiguous and conflicting periods',()=>{
  assert.throws(()=>parseKoccaDetail('<h1>접근 제한</h1>'));
  assert.throws(()=>parseKoccaDetail(html(undefined,'26.02.30')));
  assert.throws(()=>parseKoccaDetail(html(undefined,'26.09.22')));
  assert.throws(()=>parseKoccaDetail(html('신청기간: 공고문 확인')));
  assert.throws(()=>parseKoccaDetail(html('신청기간: 2026. 8. 31. ~ 9. 21. 25:00')));
});
