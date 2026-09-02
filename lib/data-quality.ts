export type QualityRecord={ministry?:string|null;applicationFrom?:string|null;applicationTo?:string|null;applicationPeriod?:string|null;supportBudget?:number|null;detailVerifiedAt?:string|null};
export function isCollectedRecord(n:{contentHash:string}){return !n.contentHash.startsWith('seed-');}
export function dataQuality(items:QualityRecord[]){
  return {total:items.length,ministry:items.filter(n=>!!n.ministry).length,
    dates:items.filter(n=>!!n.applicationFrom&&!!n.applicationTo).length,
    conditional:items.filter(n=>!!n.applicationPeriod&&!n.applicationTo).length,
    budget:items.filter(n=>n.supportBudget!=null).length,
    detail:items.filter(n=>!!n.detailVerifiedAt).length};
}
export function latestSourceChecks<T extends {sourceId:string;finishedAt:string}>(checks:T[]):T[]{
  const map=new Map<string,T>();
  const time=(s:string)=>Number.isFinite(Date.parse(s))?Date.parse(s):0;
  for(const check of checks){const prior=map.get(check.sourceId);if(!prior||time(check.finishedAt)>time(prior.finishedAt))map.set(check.sourceId,check);}
  return [...map.values()].sort((a,b)=>time(b.finishedAt)-time(a.finishedAt));
}
export function isStaleCheck(finishedAt:string,now=Date.now()){
  const stamp=Date.parse(finishedAt);
  return !Number.isFinite(stamp)||now-stamp>12*3600000;
}
