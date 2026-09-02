import {receptionState,type SearchRecord} from '../lib/notice-search';
export default function NoticeFacts({details={}}:{details?:SearchRecord}){
  const state=receptionState(details);
  const label={open:'접수 중',closed:'접수 마감',upcoming:'접수 예정',unknown:'접수기간 미확인'}[state];
  return <div className="noticeFacts">
    {details.ministry&&<div>소관부처 · {details.ministry}</div>}
    {details.businessYear&&<div>사업연도 · {details.businessYear}</div>}
    {(details.announcedFrom||details.announcedTo)&&<div>공고기간 · {details.announcedFrom||'미확인'} ~ {details.announcedTo||'미확인'}</div>}
    {details.supportBudget!=null&&<div>공고 지원예산 · {details.supportBudget.toLocaleString('ko-KR')}원</div>}
    <footer><strong>{details.applicationFrom||details.applicationTo?`${details.applicationFrom||'미확인'} ~ ${details.applicationTo||'미확인'}`:'원문 접수기간 확인'}</strong><span>{label}</span></footer>
  </div>;
}
