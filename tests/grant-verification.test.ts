import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {verifyGrant,verifyGrantDetail,grantAudits,currentGrantVerification,detailFingerprint} from '../lib/grant-verification.ts';
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
