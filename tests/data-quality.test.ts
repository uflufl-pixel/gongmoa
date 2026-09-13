import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Node native TypeScript runner requires explicit extension.
import {dataQuality,isCollectedRecord,isObviousNonGrant,latestSourceChecks,isStaleCheck} from '../lib/data-quality.ts';
test('outsourced surveys and accreditation administration are not participant opportunities',()=>{
  for(const title of ['2026년도 공공기관 고객만족도 조사 주관사업자 선정 재공고(정정)','2026년 평생교육기관 평가·인증 업무 위탁 공고'])assert.equal(isObviousNonGrant(title),true);
  for(const title of ['2026년 평생교육기관 평가·인증 신청 공고','2026년 중소기업 CBAM 대응 지원사업 참여기업 선정 공고'])assert.equal(isObviousNonGrant(title),false);
});
test('unverified seed data is not a collected record',()=>{
  assert.equal(isCollectedRecord({contentHash:'seed-example-v1'}),false);
  assert.equal(isCollectedRecord({contentHash:'abcdef'}),true);
});
test('unknown, conditional periods, and zero budgets remain distinct',()=>{
  assert.deepEqual(dataQuality([{},{applicationFrom:'2026-09-01',applicationTo:'2026-09-30',supportBudget:0,ministry:'부처'},{applicationPeriod:'모집 완료시까지'}]),{total:3,ministry:1,dates:1,conditional:1,budget:1,detail:0});
  assert.equal(dataQuality([]).total,0);
});
test('latest source failure cannot be hidden by an older success',()=>{
  const checks=[{sourceId:'a',finishedAt:'2026-09-02T03:00:00Z',outcome:'success'},{sourceId:'a',finishedAt:'2026-09-02T06:00:00Z',outcome:'failed'},{sourceId:'b',finishedAt:'2026-09-02T05:00:00Z',outcome:'success'}];
  const latest=latestSourceChecks(checks);
  assert.equal(latest.length,2);assert.equal(latest[0].outcome,'failed');
});
test('old and invalid source timestamps are stale',()=>{
  const now=Date.parse('2026-09-02T12:00:00Z');
  assert.equal(isStaleCheck('2026-09-02T03:00:00Z',now),false);
  assert.equal(isStaleCheck('2026-09-01T23:00:00Z',now),true);
  assert.equal(isStaleCheck('invalid',now),true);
});
