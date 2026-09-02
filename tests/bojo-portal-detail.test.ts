import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Node native TypeScript runner requires explicit extension.
import {portalDetailRow,validReconcileIds} from '../lib/bojo-portal-detail.ts';
const id='202633000000004800053B';
const vo={pssrpNo:id,bsnsSe:'1',pssrpSttus:'1',pblancNm:'지원사업',pssrpInsttNm:'공공기관',sportBgamt:'100000',rceptEndDe:'2026.09.03'};
test('requires exact official identity and national category',()=>{
  assert.throws(()=>portalDetailRow({taskReqstVo:{...vo,pssrpNo:'other'}},id));
  assert.throws(()=>portalDetailRow({taskReqstVo:{...vo,bsnsSe:'2'}},id));
  assert.equal(portalDetailRow({taskReqstVo:vo},id)?.RCEPT_END_DE,'2026.09.03');
});
test('closed and unknown status cannot be imported as accepting',()=>{
  for(const status of ['2','3','',null])assert.equal(portalDetailRow({taskReqstVo:{...vo,pssrpSttus:status}},id),null);
  assert.ok(portalDetailRow({taskReqstVo:{...vo,pssrpSttus:'0'}},id));
});
test('request accepts only bounded official IDs, not arbitrary URLs',()=>{
  assert.ok(validReconcileIds([id]));assert.ok(!validReconcileIds([]));assert.ok(!validReconcileIds(["https://example.com"]));assert.ok(!validReconcileIds(Array(6).fill(id)));
});
