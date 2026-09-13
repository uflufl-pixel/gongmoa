import {eq} from 'drizzle-orm';
import {getDb} from './index';
import {grantAuditRechecks} from './schema';
import {grantAudits,verifyGrant,verifyGrantDetail,type GrantVerification} from '../lib/grant-verification';
import {cachedGrantVerification,type GrantIdentity} from '../lib/grant-verification-cache';

export async function verifyGrantDetailPersistent(identity:GrantIdentity,fetcher:typeof fetch=fetch,now=Date.now()):Promise<GrantVerification>{
  const known=verifyGrant(identity,grantAudits,now);
  if(known.status==='verified')return known;
  // Never fetch or use a cached approval when identity/evidence changed.
  if(verifyGrant(identity,grantAudits,now,true).status!=='verified')return known;
  const db=getDb();
  const row=(await db.select().from(grantAuditRechecks).where(eq(grantAuditRechecks.noticeId,identity.id)).limit(1))[0];
  const cached=cachedGrantVerification(identity,row,now);
  if(cached)return cached;
  const refreshed=await verifyGrantDetail(identity,fetcher,now);
  if(refreshed.status!=='verified')return refreshed;
  const audit=grantAudits.find(a=>a.sourceId===identity.sourceId&&a.externalId===identity.externalId)!;
  const values={noticeId:identity.id,contentHash:identity.contentHash,detailHash:audit.detailHash,checkedAt:new Date(now)};
  await db.insert(grantAuditRechecks).values(values).onConflictDoUpdate({target:grantAuditRechecks.noticeId,set:values});
  return refreshed;
}
