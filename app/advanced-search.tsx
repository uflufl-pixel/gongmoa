'use client';
import {defaultFilters,searchError,type AdvancedFilters,type SearchNotice} from '../lib/notice-search';
export default function AdvancedSearch({items,value,onChange}:{items:SearchNotice[];value:AdvancedFilters;onChange:(next:AdvancedFilters)=>void}){
  const set=(key:keyof AdvancedFilters,v:string|boolean)=>onChange({...value,[key]:v});
  const unique=(values:Array<string|null|undefined>)=>[...new Set(values.filter((s):s is string=>Boolean(s)))].sort((a,b)=>a.localeCompare(b,'ko'));
  const ministries=unique(items.map(n=>n.details?.ministry));
  const orgs=unique(items.filter(n=>!value.ministry||n.details?.ministry===value.ministry).map(n=>n.org));
  const select=(label:string,key:keyof AdvancedFilters,options:string[])=><label>{label}<select value={String(value[key])} onChange={e=>set(key,e.target.value)}><option value="">전체</option>{options.map(x=><option key={x} value={x}>{x}</option>)}</select></label>;
  const error=searchError(value);
  return <section className="advancedSearch" aria-label="상세 공모 검색">
    <div className="searchRows">
      {select('지원 분야','category',unique(items.map(n=>n.tag)))}
      <label>접수 상태<select value={value.status} onChange={e=>set('status',e.target.value)}><option value="">전체</option><option value="open">접수 중</option><option value="upcoming">접수 예정</option><option value="closed">접수 마감</option><option value="unknown">접수기간 미확인</option></select></label>
      <label>정렬<select value={value.sort} onChange={e=>set('sort',e.target.value)}><option value="deadline">마감 임박순</option><option value="recent">최근 수집순</option></select></label>
      <button type="button" onClick={()=>onChange({...defaultFilters})}>상세 조건 초기화</button>
    </div>
    <div className="searchQuick"><span>빠른 선택</span><button type="button" aria-pressed={value.status==='open'&&!value.unknown} onClick={()=>onChange({...value,status:'open',unknown:false,quick:''})}>확인된 접수 중만</button><button type="button" aria-pressed={value.quick==='deadline'} onClick={()=>onChange({...value,status:'',quick:value.quick==='deadline'?'':'deadline',sort:'deadline'})}>7일 이내 접수 마감</button><button type="button" aria-pressed={value.quick==='recent'} onClick={()=>onChange({...value,quick:value.quick==='recent'?'':'recent',sort:'recent'})}>최근 7일 수집</button></div>
    <details><summary>상세 조건 · 기관, 연도, 기간, 대상, 예산</summary><div className="searchRows">
      <label>소관부처<select value={value.ministry} onChange={e=>onChange({...value,ministry:e.target.value,org:''})}><option value="">전체</option>{ministries.map(x=><option key={x}>{x}</option>)}</select></label>
      {select('수행·공고기관','org',orgs)}
      {select('사업연도','year',unique(items.map(n=>n.details?.businessYear?String(n.details.businessYear):null)))}
      <label>신청대상 키워드 (발행기관과 별개)<input value={value.audience} onChange={e=>set('audience',e.target.value)} placeholder="예: 지방자치단체, 개인, 예비창업자, 소상공인"/></label>
    </div><div className="searchRows">
      <label>기간 기준<select value={value.period} onChange={e=>set('period',e.target.value)}><option value="application">접수기간</option><option value="announced">공고기간</option></select></label>
      <label>검색 시작일<input type="date" value={value.from} onChange={e=>set('from',e.target.value)}/></label>
      <label>검색 종료일<input type="date" value={value.to} onChange={e=>set('to',e.target.value)}/></label>
    </div><div className="searchRows">
      <label>최소 지원예산 (만원)<input type="number" min="0" value={value.minBudget} onChange={e=>set('minBudget',e.target.value)} placeholder="제한 없음"/></label>
      <label>최대 지원예산 (만원)<input type="number" min="0" value={value.maxBudget} onChange={e=>set('maxBudget',e.target.value)} placeholder="제한 없음"/></label>
    </div><p>기간은 선택 범위와 겹치는 공고를 찾습니다. 지원예산은 공고 전체 예산이며, 신청자당 지원 한도가 아닙니다. 소관부처 연결은 원문에서 확인된 관계만 사용합니다.</p></details>
    <label className="unknownToggle"><input type="checkbox" checked={value.unknown} onChange={e=>set('unknown',e.target.checked)}/> 연도·접수 상태·기간·예산 미확인 공고도 포함</label>
    <p className="searchHint">상세 정보는 원문을 다시 수집하면서 채워집니다. ‘최근 수집’은 공고 게시일이 아닌 공모아 최초 저장일 기준입니다.</p>
    {error&&<p role="alert" className="searchError">{error}</p>}
  </section>;
}
