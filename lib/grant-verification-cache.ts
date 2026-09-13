// @ts-expect-error Native Node tests use explicit extensions.
import {grantAudits,verifyGrant,type GrantVerification} from './grant-verification.ts';

export type GrantIdentity={id:string;sourceId:string;externalId:string;sourceUrl:string;title:string;contentHash:string};
export type GrantRecheck={contentHash:string;detailHash:string;checkedAt:Date};
const validityMs=7*86400000;

export function cachedGrantVerification(
  identity:GrantIdentity,
  recheck:GrantRecheck|null|undefined,
  now=Date.now(),
):GrantVerification|null {
  const audit=grantAudits.find(a=>a.sourceId===identity.sourceId&&a.externalId===identity.externalId);
  if(!audit||!recheck||recheck.contentHash!==identity.contentHash||recheck.detailHash!==audit.detailHash)return null;
  const checkedAt=recheck.checkedAt.getTime();
  if(!Number.isFinite(checkedAt)||checkedAt>now||now-checkedAt>validityMs)return null;
  const verified=verifyGrant(identity,grantAudits,now,true);
  return verified.status==='verified'?{...verified,checkedAt:new Date(checkedAt).toISOString(),reason:'공식 본문 4개 요건 확인 · 마지막 원문 대조 7일 이내'}:null;
}
