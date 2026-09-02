import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Node's native TypeScript runner requires the explicit extension.
import {advancedSearch,defaultFilters,receptionState,searchError} from '../lib/notice-search.ts';
const now=Date.parse('2026-09-02T03:00:00Z');
test('explicit reception cutoffs use Korean time within the same day',()=>{
  const d={applicationFrom:'2026-09-01',applicationTo:'2026-09-02',opensAt:'2026-08-31T15:00:00Z',closesAt:'2026-09-02T09:00:00Z',deadlineLabel:'2026-09-01 00:00 ~ 2026-09-02 18:00'};
  assert.equal(receptionState(d,'2026-09-02',Date.parse('2026-09-02T08:59:00Z')),'open');
  assert.equal(receptionState(d,'2026-09-02',Date.parse('2026-09-02T09:01:00Z')),'closed');
});
const rows=[
  {id:'a',org:'기관A',tag:'문화',audience:'비영리단체',details:{ministry:'부처A',businessYear:2026,applicationFrom:'2026-09-01',applicationTo:'2026-09-07',announcedFrom:'2026-08-01',announcedTo:'2026-08-31',supportBudget:0,createdAt:'2026-09-01T00:00:00Z'}},
  {id:'b',org:'기관B',tag:'창업',audience:'중소기업',details:{ministry:'부처B',businessYear:2025,applicationFrom:'2026-10-01',applicationTo:'2026-10-10',supportBudget:10000000}},
  {id:'c',org:'기관C',tag:'문화',audience:'개인'},
];
test('confirmed reception states do not use announcement dates',()=>{
  assert.equal(receptionState(rows[0].details,'2026-09-02'),'open');
  assert.equal(receptionState(rows[1].details,'2026-09-02'),'upcoming');
  assert.equal(receptionState({announcedTo:'2026-12-31'},'2026-09-02'),'unknown');
});
test('unknown inclusion is explicit and does not admit known mismatches',()=>{
  assert.deepEqual(advancedSearch(rows,{...defaultFilters,year:'2026'},now).map(x=>x.id),['a','c']);
  assert.deepEqual(advancedSearch(rows,{...defaultFilters,year:'2026',unknown:false},now).map(x=>x.id),['a']);
});
test('zero budget is known and currency converts from ten thousand won',()=>{
  assert.deepEqual(advancedSearch(rows,{...defaultFilters,minBudget:'1',unknown:false},now).map(x=>x.id),['b']);
  assert.deepEqual(advancedSearch(rows,{...defaultFilters,maxBudget:'0',unknown:false},now).map(x=>x.id),['a']);
});
test('announcement and application intervals are distinct',()=>{
  const f={...defaultFilters,from:'2026-09-01',to:'2026-09-02',unknown:false};
  assert.deepEqual(advancedSearch(rows,f,now).map(x=>x.id),['a']);
  assert.deepEqual(advancedSearch(rows,{...f,period:'announced'},now),[]);
});
test('ministry and institution conditions combine',()=>assert.equal(advancedSearch(rows,{...defaultFilters,ministry:'부처A',org:'기관B'},now).length,0));
test('quick selections require known dates',()=>{
  assert.deepEqual(advancedSearch(rows,{...defaultFilters,quick:'deadline'},now).map(x=>x.id),['a']);
  assert.deepEqual(advancedSearch(rows,{...defaultFilters,quick:'recent'},now).map(x=>x.id),['a']);
});
test('invalid ranges return an actionable error and no results',()=>{
  const f={...defaultFilters,minBudget:'2',maxBudget:'1'};
  assert.ok(searchError(f));assert.deepEqual(advancedSearch(rows,f,now),[]);
});
