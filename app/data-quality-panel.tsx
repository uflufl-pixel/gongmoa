import {dataQuality,type QualityRecord} from '../lib/data-quality';
export default function DataQualityPanel({items}:{items:QualityRecord[]}){
  const q=dataQuality(items);
  const metrics=[['소관기관 확인',q.ministry],['접수 시작·종료일 확인',q.dates],['조건부 접수기간 확인',q.conditional],['전체 지원예산 확인',q.budget]] as const;
  return <details className="qualityPanel"><summary>수집 정보 확인 범위 · {q.total.toLocaleString()}건 기준</summary>
    <p>현재 목록에서 각 항목을 확인한 비율입니다. 전국 모든 공모사업의 수집률을 뜻하지 않습니다.</p>
    <div className="qualityGrid">{metrics.map(([label,count])=><div key={label}><span>{label}</span><strong>{count} / {q.total}건</strong><progress aria-label={label} value={count} max={Math.max(1,q.total)}/></div>)}</div>
    <p>접수일 미확인은 접수 중이라는 뜻이 아닙니다. 조건부 기간은 ‘모집 완료시까지’ 등 원문 표현을 보존합니다. 기관 후보 등록과 실제 공고 수집 연결은 별개입니다.</p>
  </details>;
}
