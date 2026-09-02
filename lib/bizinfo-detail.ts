export type BizinfoDetail={ministry:string;institution:string;audience:string|null;applicationFrom:string|null;applicationTo:string|null;applicationPeriod:string;applicationMethod:string|null};
function plain(value:string){
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_,n:string)=>{const cp=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return cp<=0x10ffff?String.fromCodePoint(cp):'';}).replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/\s+/g,' ').trim();
}
function date(value:string){
  const normalized=value.replace(/[.]/g,'-');
  const d=new Date(normalized+'T00:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===normalized?normalized:null;
}
export function parseBizinfoDetail(html:string):BizinfoDetail{
  const fields=new Map<string,string>();
  for(const m of html.matchAll(/<li\b[^>]*>\s*<span\b[^>]*class=["'][^"']*\bs_title\b[^"']*["'][^>]*>([\s\S]*?)<\/span>([\s\S]*?)<\/li>/gi)) fields.set(plain(m[1]),plain(m[2]));
  const ministry=fields.get('소관부처·지자체'),institution=fields.get('사업수행기관'),period=fields.get('신청기간'),overview=fields.get('사업개요');
  if(!ministry||!institution||!period||!overview)throw new Error('기업마당 상세 구조 변경 또는 필수 항목 누락');
  // Only the explicitly labeled application period can provide dates.
  const range=/^(\d{4}[.-]\d{2}[.-]\d{2})\s*[~～]\s*(\d{4}[.-]\d{2}[.-]\d{2})$/.exec(period);
  const from=range?date(range[1]):null,to=range?date(range[2]):null;
  if(range&&(!from||!to||from>to))throw new Error('기업마당 신청기간 날짜 오류');
  // The first bullet is the target in the official layout. Do not extract budgets.
  const target=overview.split('☞')[1]?.trim()||null;
  return {ministry:ministry.slice(0,300),institution:institution.slice(0,300),audience:target?.slice(0,500)||null,applicationFrom:from,applicationTo:to,applicationPeriod:period.slice(0,300),applicationMethod:fields.get('사업신청 방법')?.slice(0,1000)||null};
}

export function mergeBizinfoDetail<T extends {institution:string;audience:string;status:string;closesAt:Date|null;opensAt:Date|null}>(notice:T,detail:BizinfoDetail,checkedAt:number){
  const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
  return {...notice,...detail,audience:detail.audience||notice.audience,
    opensAt:detail.applicationFrom?new Date(detail.applicationFrom+'T00:00:00+09:00'):null,
    closesAt:detail.applicationTo?new Date(detail.applicationTo+'T23:59:59+09:00'):null,
    status:detail.applicationTo?(detail.applicationTo<today?'closed':'open'):notice.status,
    detailVerifiedAt:new Date(checkedAt).toISOString()};
}
