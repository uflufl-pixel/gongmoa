import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {verifyGrant,verifyGrantDetail,grantAudits,currentGrantVerification,detailFingerprint,grantReception,effectiveGrantFacts} from '../lib/grant-verification.ts';
const audit=grantAudits[0],now=Date.parse(audit.checkedAt)+1000;
test('KOSME refuses truncated nested or duplicate body boundaries',async()=>{
  await assert.rejects(()=>detailFingerprint('<div class="detail_text"><div>안내</div>신청 변경</div>'));
  await assert.rejects(()=>detailFingerprint('<div class="detail_text">a</div><div class="detail_text">b</div>'));
  assert.notEqual(await detailFingerprint('<div class="detail_text">신청</div>'),await detailFingerprint('<div class="detail_text">종료</div>'));
});
test('date and exact-time audits are upcoming before KST start without inventing a start time',()=>{
  for(const precision of ['date','time'] as const){
    const reception={applicationFrom:'2026-09-07',applicationTo:'2026-09-30',...(precision==='date'?{deadlinePrecision:'date' as const,closesAt:null}:{closesAt:'2026-09-30T09:00:00Z'})};
    const v={status:'verified' as const,reason:'test',reception};
    assert.equal(grantReception(v,Date.parse('2026-09-06T14:59:59Z')).status,'upcoming');
    assert.equal(grantReception(v,Date.parse('2026-09-06T15:00:00Z')).status,'open');
    assert.equal(grantReception(v,Date.parse('2026-09-06T14:59:59Z')).opensAt,null);
  }
});
test('expired or failed audit restores all original facts, not just badge',()=>{
  const checked=Date.parse('2026-09-01T00:00:00Z'),end=checked+7*86400000;
  const v={status:'verified' as const,reason:'test',checkedAt:new Date(checked).toISOString(),evidence:{purpose:'p',audience:'검증대상',support:'s',application:'a'},reception:{applicationFrom:'2026-09-01',applicationTo:'2026-09-10',closesAt:null,deadlinePrecision:'date' as const}};
  for(const original of [{audience:'원본대상',applicationFrom:null,applicationTo:null,closesAt:null,status:'unknown',deadlineLabel:'원문 확인'}, {audience:'원본대상',applicationFrom:'2026-08-01',applicationTo:'2026-08-31',closesAt:'2026-08-31T09:00:00Z',status:'closed',deadlineLabel:'원본 마감'}]){
    for(const at of [end-1,end])assert.equal(effectiveGrantFacts(original,v,at).grantVerification.status,'verified');
    const opened=effectiveGrantFacts(original,v,end+1);
    const fresh=effectiveGrantFacts(original,currentGrantVerification(v,end+1),end+1);
    assert.deepEqual(opened,fresh);
    for(const key of Object.keys(original))assert.deepEqual(opened[key as keyof typeof opened],original[key as keyof typeof original]);
    assert.equal(effectiveGrantFacts(original,{status:'candidate',reason:'failed'},end).audience,original.audience);
    if(original.status==='closed')assert.equal(effectiveGrantFacts(original,v,end-1).status,'closed');
  }
});
test('KOAT hashes complete nested body and rejects ambiguous boundaries',async()=>{
  const body='<td class="main"><div>지원</div><div>신청</div></td>';
  assert.equal(await detailFingerprint(body,'koat'),await detailFingerprint(body+'<footer>변경</footer>','koat'));
  assert.notEqual(await detailFingerprint(body,'koat'),await detailFingerprint(body.replace('신청','마감'),'koat'));
  await assert.rejects(()=>detailFingerprint(body+body,'koat'));
  await assert.rejects(()=>detailFingerprint('<td class="main"><table><td>nested</td></table></td>','koat'));
});
test('KOAT exact cutoff and invalid reception values fail safely',()=>{
  const a=grantAudits.find(x=>x.sourceId==='koat-board'&&x.externalId==='16460')!;
  assert.ok(a.reception&&a.reception.deadlinePrecision!=='date');
  const v=verifyGrant(a,grantAudits,Date.parse(a.checkedAt)+1000);
  assert.equal(grantReception(v,Date.parse('2026-09-09T08:59:00Z')).status,'open');
  assert.equal(grantReception(v,Date.parse('2026-09-09T09:01:00Z')).status,'closed');
  for(const patch of [{closesAt:'bad'},{applicationFrom:'2026-09-10'},{applicationTo:'2026-02-30'},{closesAt:'2026-09-10T09:00:00Z'}])assert.deepEqual(grantReception({...v,reception:{...a.reception!,...patch}}),{});
});
test('date-only audit removes inferred time and distinguishes Korean deadline day',()=>{
  const a=grantAudits.find(x=>x.sourceId==='koat-board'&&x.externalId==='16431')!;
  const v=verifyGrant(a,grantAudits,Date.parse(a.checkedAt)+1000);
  for(const [instant,state] of [['2026-09-03T14:59:00Z','open'],['2026-09-03T15:00:00Z','unknown'],['2026-09-04T14:59:00Z','unknown'],['2026-09-04T15:00:00Z','closed']]){
    const result=grantReception(v,Date.parse(instant));assert.equal(result.status,state);assert.equal(result.closesAt,null);assert.equal(result.deadlinePrecision,'date');
    assert.equal({...{closesAt:'inferred'},...result}.closesAt,null);
  }
  assert.deepEqual(grantReception({...v,status:'candidate'}),{});
});
test('only same audited identity and four evidence fields qualify, never titles or old approvals',()=>{
  assert.equal(verifyGrant(audit,grantAudits,now).status,'verified');
  assert.equal(verifyGrant({...audit,externalId:'other'},grantAudits,now).status,'candidate');
  assert.equal(verifyGrant({...audit,contentHash:'changed'},grantAudits,now).status,'candidate');
  assert.equal(verifyGrant({...audit,sourceUrl:'https://evil.test'},grantAudits,now).status,'candidate');
  for(const field of ['purpose','audience','support','application'])assert.equal(verifyGrant(audit,[{...audit,evidence:{...audit.evidence,[field]:''}}],now).status,'candidate');
  assert.equal(verifyGrant(audit,[],now).status,'candidate');
});
test('audit age is enforced both server-side and on an already-open page',()=>{
  assert.equal(verifyGrant(audit,grantAudits,now+8*86400000).status,'candidate');
  assert.equal(currentGrantVerification(verifyGrant(audit,grantAudits,now),now+8*86400000).status,'candidate');
  assert.equal(currentGrantVerification(undefined,now).status,'candidate');
});
test('detail changes, error pages and timeouts cannot retain verified status',async()=>{
  const fetcher:typeof fetch=async(url,init)=>{assert.equal(url,audit.sourceUrl);assert.equal(init?.redirect,'manual');assert.ok(init?.signal);return new Response('<div class="detail_text">changed</div>')};
  assert.equal((await verifyGrantDetail(audit,fetcher,now)).status,'candidate');
  assert.equal((await verifyGrantDetail(audit,async()=>{throw Error('timeout')},now)).status,'candidate');
  assert.equal((await verifyGrantDetail(audit,async()=>new Response('error',{status:500}),now)).status,'candidate');
  await assert.rejects(()=>detailFingerprint('<html>error</html>'));
  let called=false;await verifyGrantDetail({...audit,externalId:'other'},async()=>{called=true;return new Response('')},now);assert.equal(called,false);
});
test('NIPA hashes the full labeled content including nested divs, not navigation',async()=>{
  const body='<label id="BSNS_ANNC_CONT_323-001"><div>nested</div>지원 신청</label>';
  assert.equal(await detailFingerprint(body,'nipa'),await detailFingerprint('<nav>new</nav>'+body,'nipa'));
  assert.notEqual(await detailFingerprint(body,'nipa'),await detailFingerprint(body.replace('신청','취소'),'nipa'));
  await assert.rejects(()=>detailFingerprint(body.replace('323-001','other'),'nipa'));
});
test('confirmed closed recruitment never becomes an open opportunity and candidates gain no dates',()=>{
  const a=grantAudits.find(x=>x.externalId==='1335')!;
  const v=verifyGrant(a,grantAudits,Date.parse(a.checkedAt)+1000);
  const r=grantReception(v,Date.parse('2026-09-04T00:00:00Z'));
  assert.equal(r.status,'closed');assert.equal(r.applicationTo,'2026-08-06');assert.match(r.deadlineLabel||'',/18:00/);
  assert.deepEqual(grantReception({status:'candidate',reason:'changed',reception:a.reception}),{});
});
