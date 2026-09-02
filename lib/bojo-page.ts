export type BojoRow = Record<string,string|undefined>;
export const BOJO_PAGE_SIZE = 500;

export function unpackBojoPage(payload:unknown, requestedPage:number, pageSize:number) {
  const response=(payload as {response?:{header?:{resultCode?:string};body?:{totalCount?:number|string;pageNo?:number|string;numOfRows?:number|string;items?:{item?:BojoRow|BojoRow[]}}}})?.response;
  if(response?.header?.resultCode!=='00') throw new Error(`보조금 API 오류 (${response?.header?.resultCode||'invalid response'})`);
  const body=response.body;
  const total=Number(body?.totalCount);
  if(!body||!Number.isSafeInteger(total)||total<0||Number(body.pageNo)!==requestedPage||Number(body.numOfRows)!==pageSize) throw new Error('보조금 API 페이지 정보 불일치');
  const raw=body.items?.item;
  const rows=raw?(Array.isArray(raw)?raw:[raw]):[];
  const expected=Math.max(0,Math.min(pageSize,total-(requestedPage-1)*pageSize));
  if(rows.length!==expected) throw new Error('보조금 API 페이지 누락 감지: 다음 실행에서 재시도');
  return {rows,total,nextPage:requestedPage*pageSize>=total?null:requestedPage+1};
}

export function bojoDate(value:string) {
  const match=/^(\d{4})[.-]?(\d{2})[.-]?(\d{2})\.?$/.exec(value);
  if(!match) return '';
  const iso=`${match[1]}-${match[2]}-${match[3]}`;
  const date=new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===iso?iso:'';
}
