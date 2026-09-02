import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native TS imports require the extension.
import {applicationPeriod} from '../lib/application-period.ts';
test('preserves explicit Korean application times rather than midnight',()=>{
  const d=applicationPeriod('2026-06-30 00:00 ~ 2026-08-30 23:00');
  assert.equal(d?.applicationFrom,'2026-06-30');assert.equal(d?.applicationTo,'2026-08-30');assert.equal(d?.closesAt.toISOString(),'2026-08-30T14:00:00.000Z');
});
test('date-only ranges are valid but conditions and invalid dates remain unknown',()=>{
  assert.ok(applicationPeriod('2026-09-01 ~ 2026-09-30'));
  for(const s of ['모집 완료시까지','2026-02-30 ~ 2026-03-01','2026-09-01 24:00 ~ 2026-09-03 18:00','2026-09-02 18:00 ~ 2026-09-02 09:00','게시일 2026-09-01'])assert.equal(applicationPeriod(s),null);
});
