export type SearchRecord={ministry?:string|null;businessYear?:number|null;announcedFrom?:string|null;announcedTo?:string|null;applicationFrom?:string|null;applicationTo?:string|null;supportBudget?:number|null;applicationMethod?:string|null;status?:string;createdAt?:string;closesAt?:string|null};
export type SearchNotice={id:string;org:string;tag:string;audience:string;details?:SearchRecord};
export type AdvancedFilters={category:string;ministry:string;org:string;year:string;status:string;audience:string;period:string;from:string;to:string;minBudget:string;maxBudget:string;unknown:boolean;quick:string;sort:string};
export const defaultFilters:AdvancedFilters={category:'',ministry:'',org:'',year:'',status:'',audience:'',period:'application',from:'',to:'',minBudget:'',maxBudget:'',unknown:true,quick:'',sort:'deadline'};
export function kstDay(time=Date.now()){return new Date(time+9*3600000).toISOString().slice(0,10)}
export function receptionState(d:SearchRecord={},today=kstDay()){
  if(d.status==='closed'||(d.applicationTo&&d.applicationTo<today))return 'closed';
  if(d.applicationFrom&&d.applicationFrom>today)return 'upcoming';
  if(d.applicationFrom&&d.applicationTo&&d.applicationFrom<=today&&d.applicationTo>=today)return 'open';
  return 'unknown';
}
export function searchError(f:AdvancedFilters){
  if(f.from&&f.to&&f.from>f.to)return '시작일은 종료일보다 늦을 수 없습니다.';
  for(const v of [f.minBudget,f.maxBudget])if(v&&(!Number.isFinite(Number(v))||Number(v)<0))return '지원예산은 0 이상의 숫자로 입력해 주세요.';
  if(f.minBudget&&f.maxBudget&&Number(f.minBudget)>Number(f.maxBudget))return '최소 예산은 최대 예산보다 클 수 없습니다.';
  return '';
}
export function advancedSearch<T extends SearchNotice>(items:T[],f:AdvancedFilters,now=Date.now()):T[]{
  if(searchError(f))return [];
  const today=kstDay(now),week=kstDay(now+7*86400000);
  const matches=items.filter(n=>{
    const d=n.details||{},state=receptionState(d,today);
    if(f.category&&n.tag!==f.category)return false;
    if(f.ministry&&d.ministry!==f.ministry)return false;
    if(f.org&&n.org!==f.org)return false;
    if(f.year&&(d.businessYear==null?!f.unknown:String(d.businessYear)!==f.year))return false;
    if(f.status&&state!==f.status&&!(state==='unknown'&&f.unknown))return false;
    if(f.audience&&!n.audience.toLowerCase().includes(f.audience.toLowerCase()))return false;
    const start=f.period==='announced'?d.announcedFrom:d.applicationFrom;
    const end=f.period==='announced'?d.announcedTo:d.applicationTo;
    // Match overlapping intervals; unknown endpoints never override a known mismatch.
    if(f.from&&end&&end<f.from)return false;
    if(f.to&&start&&start>f.to)return false;
    if((f.from||f.to)&&(!start||!end)&&!f.unknown)return false;
    if(f.minBudget||f.maxBudget){
      if(d.supportBudget==null){if(!f.unknown)return false;}
      else if((f.minBudget&&d.supportBudget<Number(f.minBudget)*10000)||(f.maxBudget&&d.supportBudget>Number(f.maxBudget)*10000))return false;
    }
    if(f.quick==='deadline'&&(!d.applicationTo||d.applicationTo<today||d.applicationTo>week||state==='closed'))return false;
    if(f.quick==='recent'&&(!d.createdAt||!Number.isFinite(Date.parse(d.createdAt))||Date.parse(d.createdAt)<now-7*86400000||Date.parse(d.createdAt)>now))return false;
    return true;
  });
  return matches.sort((a,b)=>{
    const aa=a.details||{},bb=b.details||{};
    const date=(v?:string|null)=>v&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
    const av=f.sort==='recent'?date(aa.createdAt):date(aa.applicationTo||aa.closesAt),bv=f.sort==='recent'?date(bb.createdAt):date(bb.applicationTo||bb.closesAt);
    if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
    return av!==null&&bv!==null&&av!==bv?(f.sort==='recent'?bv-av:av-bv):a.id.localeCompare(b.id);
  });
}
