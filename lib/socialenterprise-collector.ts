// @ts-ignore Native Node test runner uses explicit extensions.
import {centralGrantCandidate} from './central-collectors.ts';

export const socialenterpriseSource={id:'socialenterprise-board',institutionId:'public-009',name:'한국사회적기업진흥원 사업공고',url:'https://www.socialenterprise.or.kr/homepage/bbs/board.do?bsIdx=10002&menuId=822'};
export function fetchSocialenterpriseList(fetcher:typeof fetch=fetch){
  return fetcher('https://www.socialenterprise.or.kr/homepage/bbs/ajax/boardList.do',{
    method:'POST',redirect:'manual',signal:AbortSignal.timeout(10000),
    headers:{accept:'application/json','content-type':'application/x-www-form-urlencoded','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'},
    body:new URLSearchParams({menuId:'822',bsIdx:'10002',page:'1',bcIdx:'10002',searchCondition:'',searchKeyword:'',categoryAllYn:'Y'}).toString(),
  });
}
function invalid():never{throw new Error('사회적기업진흥원 사업공고 구조 확인 필요');}
export function parseSocialenterpriseBoard(input:string){
  if(input.length>512_000)invalid();
  let data;
  try{data=JSON.parse(input);}catch{invalid();}
  const p=data?.paginationInfo;
  if(data?.resultCode!=='0'||!Array.isArray(data.noticeList)||!Array.isArray(data.resultList)||
    !p||p.currentPageNo!==1||p.recordCountPerPage!==10||p.firstRecordIndex!==0||
    !Number.isSafeInteger(p.totalRecordCount)||p.totalRecordCount<0||
    p.totalPageCount!==Math.ceil(p.totalRecordCount/10)||
    data.resultList.length!==Math.min(p.totalRecordCount,10)||data.noticeList.length>30)invalid();
  const rows=[...data.noticeList,...data.resultList];
  const seen=new Map<string,string>();
  const items=rows.flatMap((row:Record<string,unknown>)=>{
    if(!row||typeof row.B_IDX!=='string'||!/^\d+$/.test(row.B_IDX)||!/[1-9]/.test(row.B_IDX)||
      row.BS_IDX!=='10002'||row.BC_IDX!=='10002'||row.DEL_YN!=='N'||
      (row.CATEGORY_NAME??row.CATEGORYNAME)!=='사업공고'||
      typeof row.SUBJECT!=='string'||!row.SUBJECT.trim()||row.SUBJECT.length>2000||
      typeof row.WRITE_DATE!=='string'||!/^\d{4}\/\d{2}\/\d{2}$/.test(row.WRITE_DATE))invalid();
    const title=row.SUBJECT.replace(/\s+/g,' ').trim(),posted=row.WRITE_DATE.replaceAll('/','-');
    const date=new Date(posted+'T00:00:00Z');
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==posted)invalid();
    const signature=JSON.stringify([title,posted]);
    if(seen.has(row.B_IDX)){if(seen.get(row.B_IDX)!==signature)invalid();return [];}
    seen.set(row.B_IDX,signature);
    // Certification/measurement and compliance classes are not support competitions.
    if(!centralGrantCandidate(title)||/측정기업|경영공시\s*교육|설립인가교육/.test(title))return [];
    return [{sourceId:socialenterpriseSource.id,externalId:row.B_IDX,institution:'한국사회적기업진흥원',group:'공사·공단',title,
      category:'사회적경제·기업지원',audience:'원문 지원자격 확인',region:null,sourceName:socialenterpriseSource.name,
      sourceUrl:`https://www.socialenterprise.or.kr/homepage/bbs/boardView.do?bsIdx=10002&bIdx=${row.B_IDX}&page=1&menuId=822`,
      announcedFrom:posted,applicationFrom:null,applicationTo:null,opensAt:null,closesAt:null,
      deadlineLabel:'접수기간 원문 확인',status:'unknown',ministry:'고용노동부'}];
  });
  return {items,parsedRows:rows.length};
}
