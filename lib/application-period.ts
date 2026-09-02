// Only pass a field explicitly labeled as the application/reception period.
export function applicationPeriod(value:string){
  const m=/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\s*~\s*(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?$/.exec(value.trim());
  if(!m)return null;
  const validDate=(s:string)=>{const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;};
  const validTime=(s?:string)=>!s||(/^([01]\d|2[0-3]):[0-5]\d$/).test(s);
  if(!validDate(m[1])||!validDate(m[3])||!validTime(m[2])||!validTime(m[4]))return null;
  const opensAt=new Date(`${m[1]}T${m[2]||'00:00'}:00+09:00`);
  const closesAt=new Date(`${m[3]}T${m[4]||'23:59'}:${m[4]?'00':'59'}+09:00`);
  if(opensAt>closesAt)return null;
  return {applicationFrom:m[1],applicationTo:m[3],opensAt,closesAt};
}
