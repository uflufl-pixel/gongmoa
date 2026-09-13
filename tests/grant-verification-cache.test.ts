import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node tests use explicit extensions.
import {cachedGrantVerification} from '../lib/grant-verification-cache.ts';
// @ts-expect-error Native Node tests use explicit extensions.
import {grantAudits} from '../lib/grant-verification.ts';

const audit=grantAudits.find(a=>a.sourceId==='koat-board'&&a.externalId==='16431')!;
const identity={id:'koat-board-16431',sourceId:audit.sourceId,externalId:audit.externalId,sourceUrl:audit.sourceUrl,title:audit.title,contentHash:audit.contentHash};
const now=Date.parse(audit.checkedAt)+8*86400000;
const recheck={contentHash:audit.contentHash,detailHash:audit.detailHash,checkedAt:new Date(now-1000)};

test('a fresh persisted official recheck is stable during brief source outages',()=>{
  const result=cachedGrantVerification(identity,recheck,now);
  assert.equal(result?.status,'verified');
  assert.equal(result?.checkedAt,recheck.checkedAt.toISOString());
  assert.equal(cachedGrantVerification(identity,recheck,now+7*86400000-1000)?.status,'verified');
  assert.equal(cachedGrantVerification(identity,recheck,now+7*86400000),null);
});

test('changed list, audit body or title cannot inherit an older recheck',()=>{
  assert.equal(cachedGrantVerification({...identity,contentHash:'changed'},recheck,now),null);
  assert.equal(cachedGrantVerification({...identity,title:'changed'},recheck,now),null);
  assert.equal(cachedGrantVerification(identity,{...recheck,detailHash:'changed'},now),null);
  assert.equal(cachedGrantVerification(identity,{...recheck,checkedAt:new Date(now+1)},now),null);
});
