export type GrantEvidence={purpose:string;audience:string;support:string;application:string};
export type GrantAudit={sourceId:string;externalId:string;sourceUrl:string;title:string;contentHash:string;detailHash:string;checkedAt:string;evidence:GrantEvidence};
export type GrantVerification={status:'verified'|'candidate';reason:string;checkedAt?:string;sourceUrl?:string;evidence?:GrantEvidence};
export function currentGrantVerification(v?:GrantVerification,now=Date.now()):GrantVerification{
  if(!v)return {status:'candidate',reason:'본문 검토 필요'};
  if(v.status==='verified'){
    const age=now-Date.parse(v.checkedAt||'');
    if(!Number.isFinite(age)||age<0||age>7*86400000)return {status:'candidate',reason:'본문 확인 유효기간 경과 · 재검토 필요'};
  }
  return v;
}
// Reviewed official detail, not an automatic title/keyword decision. Source changes invalidate this audit.
export const grantAudits:GrantAudit[]=[{
  sourceId:'kosme-esg',externalId:'1351',sourceUrl:'https://kdoctor.kosmes.or.kr/esgplatform/board/board13View.do?idx=1351',
  title:'2026년 중소기업 CBAM 대응 인프라구축 사업 3차 수요기업 모집 공고',contentHash:'a574d387685d5afaa2895f0b498a3389c512d3a48d8eb6c6a6a47cb72c54a50a',detailHash:'1e88b95e8c194169e5cbe8ca9e2a23cdf174dff0a38ad6abaf7b26c29f3fa0f1',checkedAt:'2026-09-03T21:45:36.000Z',
  evidence:{purpose:'중소기업의 EU CBAM 등 탄소규제 대응 역량 강화',audience:'CBAM 대상 품목을 제조하고 EU 직접·간접 수출 또는 수출을 희망하는 중소기업',support:'선택 트랙별 계측설비·모니터링 시스템 구축 및 탄소배출량 검증 서비스',application:'ESG 통합플랫폼의 MRV 보급사업 → 사업신청에서 신청. 본문 접수 안내: 8월 25일~9월 15일 18시.'},
}];
type RecordIdentity={sourceId:string;externalId:string;sourceUrl:string;title:string;contentHash:string};
export function verifyGrant(n:RecordIdentity,audits:GrantAudit[]=grantAudits,now=Date.now()):GrantVerification{
  const a=audits.find(a=>a.sourceId===n.sourceId&&a.externalId===n.externalId);
  const candidate=(reason:string):GrantVerification=>({status:'candidate',reason});
  if(!a)return candidate('사업 목적·지원대상·지원내용·신청절차 본문 검토 필요');
  if(a.sourceUrl!==n.sourceUrl||a.title!==n.title||a.contentHash!==n.contentHash)return candidate('공고 변경 또는 원문 불일치 · 재검토 필요');
  const age=now-Date.parse(a.checkedAt);
  if(!Number.isFinite(age)||age<0||age>7*86400000)return candidate('본문 확인 후 7일 경과 · 재검토 필요');
  if(!['purpose','audience','support','application'].every(k=>typeof a.evidence?.[k as keyof GrantEvidence]==='string'&&a.evidence[k as keyof GrantEvidence].trim().length>0))return candidate('본문 확인 근거 부족');
  return {status:'verified',reason:'공식 본문 4개 요건 확인 · 접수 상태는 별도 확인',checkedAt:a.checkedAt,sourceUrl:a.sourceUrl,evidence:a.evidence};
}
export async function detailFingerprint(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const body=clean.match(/<div class="detail_text">([\s\S]*?)<\/div>/)?.[1];
  if(!body)throw new Error('본문 구조 확인 필요');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.replace(/\s+/g,' ').trim()));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function verifyGrantDetail(n:RecordIdentity,fetcher:typeof fetch=fetch,now=Date.now()):Promise<GrantVerification>{
  const result=verifyGrant(n,grantAudits,now);if(result.status!=='verified')return result;
  const audit=grantAudits.find(a=>a.sourceId===n.sourceId&&a.externalId===n.externalId)!;
  // Only this reviewed official endpoint is enabled; record URLs never drive arbitrary fetches.
  if(audit.sourceUrl!=='https://kdoctor.kosmes.or.kr/esgplatform/board/board13View.do?idx=1351')return {status:'candidate',reason:'본문 대조 경로 미설정'};
  try{
    const r=await fetcher(audit.sourceUrl,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});
    if(!r.ok||await detailFingerprint(await r.text())!==audit.detailHash)return {status:'candidate',reason:'본문 변경 또는 응답 오류 · 재검토 필요'};
    return result;
  }catch{return {status:'candidate',reason:'공식 본문 재확인 지연 · 검토 후보 유지'};}
}
