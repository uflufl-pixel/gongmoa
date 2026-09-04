import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {verifyGrant,verifyGrantDetail,grantAudits,currentGrantVerification,detailFingerprint,grantReception} from '../lib/grant-verification.ts';
const audit=grantAudits[0],now=Date.parse(audit.checkedAt)+1000;
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
