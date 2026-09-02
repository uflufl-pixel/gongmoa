import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Node's native TypeScript runner requires the explicit extension.
import {unpackBojoPage,bojoDate} from '../lib/bojo-page.ts';
const payload=(total:number,page:number,size:number,rows:unknown)=>({response:{header:{resultCode:'00'},body:{totalCount:total,pageNo:page,numOfRows:size,items:{item:rows}}}});
test('continues beyond first page and stops at total',()=>{
  assert.equal(unpackBojoPage(payload(3,1,2,[{},{}]),1,2).nextPage,2);
  assert.equal(unpackBojoPage(payload(3,2,2,{}),2,2).nextPage,null);
});
test('zero rows is a valid complete result',()=>assert.equal(unpackBojoPage(payload(0,1,2,undefined),1,2).nextPage,null));
test('missing rows and wrong page cannot advance checkpoint',()=>{
  assert.throws(()=>unpackBojoPage(payload(3,1,2,[{}]),1,2));
  assert.throws(()=>unpackBojoPage(payload(3,2,2,[{}]),1,2));
});
test('normalizes compact, dotted and ISO dates without accepting impossible dates',()=>{
  for(const value of ['20260902','2026.09.02.','2026-09-02']) assert.equal(bojoDate(value),'2026-09-02');
  assert.equal(bojoDate('20260230'),'');assert.equal(bojoDate('상시'),'');
});
