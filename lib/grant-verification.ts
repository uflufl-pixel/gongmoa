// @ts-expect-error Native Node tests use explicit extensions.
import {namhaeUrl,verifyNamhaeEvidence} from './namhae-evidence.ts';
// @ts-expect-error Native Node tests use explicit extensions.
import {ripcSourceUrl,verifyRipcEvidence} from './ripc-evidence.ts';
// @ts-expect-error Native Node tests use explicit extensions.
import {tourazUrl,verifyTourazEvidence} from './touraz-evidence.ts';
// @ts-expect-error Native Node tests use explicit extensions.
import {uctfTourazUrl,verifyUctfEvidence} from './uctf-evidence.ts';
export type GrantEvidence={purpose:string;audience:string;support:string;application:string};
type Reception={applicationFrom:string;applicationTo:string}&({deadlinePrecision:'date';closesAt:null}|{deadlinePrecision?:'time';closesAt:string});
export type GrantAudit={sourceId:string;externalId:string;sourceUrl:string;title:string;contentHash:string;detailHash:string;checkedAt:string;evidence:GrantEvidence;reception?:Reception};
export type GrantVerification={status:'verified'|'candidate';reason:string;checkedAt?:string;sourceUrl?:string;evidence?:GrantEvidence;reception?:Reception};
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
  sourceId:'koat-board',externalId:'16431',sourceUrl:'https://www.koat.or.kr/board/business/16431/view.do',
  title:'「2026년 저탄소 인증농산물 품평상담회」참여농가 모집 공고',contentHash:'42ce7f15037b6bc43e2dd7f80d0dd2c67762f202c8935275cf6bdd36976607d5',detailHash:'49729389bbb24c7470ebc7da5fb93e2f12a87c07c3f556881ad6a5bc01537241',checkedAt:'2026-09-04T11:33:27.599Z',
  reception:{applicationFrom:'2026-08-18',applicationTo:'2026-09-04',closesAt:null,deadlinePrecision:'date'},
  evidence:{purpose:'행사 내용에 근거한 요약: 저탄소 인증농산물 평가·유통상담·홍보 지원',audience:'행사일 기준 저탄소 인증이 유효하고 인증 농산물을 생산·판매하는 농가 약 20명. 가공식품 제외',support:'전시·시식·평가 및 유통채널 MD 1:1 상담. 우수농가에 한해 설명절선물전 홍보와 목재간판 설치',application:'공식 원문의 온라인 폼으로 신청. 8월 18일~9월 4일, 마감시각 미기재. 폼 제출 가능 여부·첨부 세부조건은 별도 확인'},
},{
  sourceId:'koat-board',externalId:'16460',sourceUrl:'https://www.koat.or.kr/board/business/16460/view.do',
  title:'스마트팜 청년창업 보육센터 글로벌 역량강화 참여자 모집 수정공고',contentHash:'b24ff6575a423fa300bc55f86c0f43d9d790c057bfdc4d0a691030721410c903',detailHash:'a7fba963f3e643b1e257f1c2626025d511c9cafed3f8efce64470beb008fd207',checkedAt:'2026-09-04T09:00:32.946Z',
  reception:{applicationFrom:'2026-09-01',applicationTo:'2026-09-09',closesAt:'2026-09-09T09:00:00.000Z'},
  evidence:{purpose:'선진 스마트팜 현장 학습으로 청년 농업인의 영농 역량 강화',audience:'보육센터 8기 교육생 팀(수료 후 창업 예정) 또는 1~7기 수료생 개인(자가창업·임대팜 입주). 교육 중 징계 및 보육센터 사업 내 연수 경험이 없어야 함',support:'총 28명, 네덜란드 6박 8일 현장견학·전문가 교류 전액 국비 지원',application:'공식 원문의 네이버 폼으로 신청. 2026년 9월 9일 18시 마감. 첨부 세부서류 및 폼 제출 가능 여부는 별도 확인'},
},{
  sourceId:'kosme-esg',externalId:'1351',sourceUrl:'https://kdoctor.kosmes.or.kr/esgplatform/board/board13View.do?idx=1351',
  title:'2026년 중소기업 CBAM 대응 인프라구축 사업 3차 수요기업 모집 공고',contentHash:'a574d387685d5afaa2895f0b498a3389c512d3a48d8eb6c6a6a47cb72c54a50a',detailHash:'1e88b95e8c194169e5cbe8ca9e2a23cdf174dff0a38ad6abaf7b26c29f3fa0f1',checkedAt:'2026-09-03T21:45:36.000Z',
  evidence:{purpose:'중소기업의 EU CBAM 등 탄소규제 대응 역량 강화',audience:'CBAM 대상 품목을 제조하고 EU 직접·간접 수출 또는 수출을 희망하는 중소기업',support:'선택 트랙별 계측설비·모니터링 시스템 구축 및 탄소배출량 검증 서비스',application:'ESG 통합플랫폼의 MRV 보급사업 → 사업신청에서 신청. 본문 접수 안내: 8월 25일~9월 15일 18시.'},
},{
  sourceId:'kosme-esg',externalId:'1335',sourceUrl:'https://kdoctor.kosmes.or.kr/esgplatform/board/board13View.do?idx=1335',
  title:'2026년 중소기업 CBAM 대응 인프라구축 사업 2차 수요기업 모집 공고',contentHash:'3bcd90ab02d952350e99bcc7da6df25d5effbd4c9ce6745e7de91315ea5021ed',detailHash:'db99f706c335c9866432b45c0d466c5348d204997ab694146aca75b7cb706b85',checkedAt:'2026-09-04T07:43:39.000Z',
  reception:{applicationFrom:'2026-07-16',applicationTo:'2026-08-06',closesAt:'2026-08-06T09:00:00.000Z'},
  evidence:{purpose:'중소기업의 EU 탄소규제 대응 역량 강화',audience:'CBAM 품목을 제조하고 EU 직·간접 수출 또는 수출을 희망하는 중소기업',support:'트랙별 계측장비·모니터링 시스템 및 배출량 검증 서비스',application:'ESG 통합플랫폼 → MRV 보급사업 → 사업신청. 7월 16일~8월 6일 18시 접수로 현재 마감.'},
},{
  sourceId:'nipa-board',externalId:'16900',sourceUrl:'https://www.nipa.kr/home/2-2/16900',
  title:'2026년 KoVAC XR 쇼룸 입주기업 2차 모집',contentHash:'ad5debb8612f08df2821c8e6436f65574c6651494e6cf754baabef9f603d1984',detailHash:'c0932d38a3f26d1afa4496f8e2f5f256a55ebf1b7b2d017d9f5d836105a8d8a9',checkedAt:'2026-09-04T07:43:39.000Z',
  evidence:{purpose:'가상융합 콘텐츠 상설 전시를 통한 홍보·마케팅·투자유치 지원',audience:'XR·AI·SW 등 ICT·가상융합 콘텐츠 개발·서비스 전문기업',support:'전시공간 임대료·관리비 무상 및 요청 시 운영인력 지원. 인테리어·설치·철거는 기업 부담',application:'NIPA 사업지원시스템에서 온라인 접수. 2026년 9월 17일 15시 마감. 개인·예비창업자 신청 허용 여부는 별도 확인.'},
},{
  sourceId:'bizinfo',externalId:'PBLN_000000000126034',sourceUrl:namhaeUrl,
  title:'2026년 남해군 면 지역 마을가게 창업 지원사업 참여자 모집 공고',contentHash:'940b423811359f977fee8d38c8d6712cbaebc543811adc3256a63532aa32ebc6',detailHash:'215a518677b309f03ab4bd2e2a62b34ee17798b76a66b4a38957fab70fe75646',checkedAt:'2026-09-04T16:30:00.000Z',
  reception:{applicationFrom:'2026-09-01',applicationTo:'2026-09-23',closesAt:'2026-09-23T09:00:00.000Z'},
  evidence:{purpose:'남해군 면 지역 생활 수요에 대응하는 마을가게 창업 지원',audience:'남해군9개 면 창업 희망자. 2026-01-01 주민등록 또는 선정 후1개월 내 전입, 선정 후2개월 내 사업자등록. 예비창업자는2026-09-01 본인 명의 사업자등록 없음, 기창업자는2026-01-01 이후 등록. 체납·동일내용 중복지원·유해업종·대기업 프랜차이즈 직영점 등 제외',support:'10개소, 공급가액70% 이내·최대300만원. 부가세·초과액 자부담, 사업자등록 완료 후 지급. 인테리어·간판·디지털기기 등 지정 항목. 1년 영업유지 등 중지·환수 조건은 공식 첨부 확인',application:'2026-09-23 18시까지 남해군 경제과 지역경제팀 방문 제출. 신청서·견적서·동의서·주민등록초본·납세증명·사업자등록 사실증명 필요. 공식 본문과 공고 HWPX를 대조했으며 개인별 적격성·제출 성공은 별도 확인'},
},{
  sourceId:'bizinfo',externalId:'PBLN_000000000126087',sourceUrl:ripcSourceUrl,
  title:'[강원] 남부권 2026년 소상공인 IP창출지원 레시피 특허 출원 지원사업 모집 공고',contentHash:'797d5e7e8ad53455b98ed0c12194f6d255ae5f8e7020ca2cd82351d539b8ac55',detailHash:'0565e5c1522fc195757cacce8b8e6915b8a1780cc0ec59ef8d7080592bf68c65',checkedAt:'2026-09-04T22:30:00.000Z',
  reception:{applicationFrom:'2026-09-01',applicationTo:'2026-09-10',closesAt:'2026-09-10T08:00:00.000Z'},
  evidence:{purpose:'소상공인이 보유한 음식 조리·식품 제조 레시피를 특허로 출원해 지식재산 피해를 예방하고 안정적 성장을 지원',audience:'사업자등록증을 보유한 소상공인 대표자로, 2026년 상표출원 지원 또는 IP창출 종합패키지 중 정확히 하나를 지원받고 즉시 출원할 정도로 구체적인 레시피를 보유해야 함. 휴·폐업, 금융기관 불량거래, 비영리, 프랜차이즈 가맹점·가맹점이 있는 본부 등 제외. 공고별 관할지역과 제외업종 세부표는 원문에서 미확인',support:'분담금 포함 375만원 이내. 소상공인 분담 20%(현금10%+현물10%), 출원·등록 관납료 별도. 지원금은 선정 협력기관에 지급되며 신청자 현금지원이 아님',application:'RIPC 지원사업 신청시스템에서 지원기업으로 가입해 활용계획서를 제출. 2026년 9월 10일 17시 마감. 공식 본문과 HWP 공고문을 대조했으며 개인별 적격성·실제 제출 성공은 별도 확인'},
},{
  sourceId:'touraz-kto',externalId:'1709',sourceUrl:tourazUrl,
  title:'2027 무장애 관광환경 조성 사업 공모 실시',contentHash:'de9aadd6d0f93490d19e499e3c32dbadc236a34b5c48077b39a199ce7c6bd767',detailHash:'6cb5b4bce1fda2d08f3339d8e68462d25a495e7066cbb6282fad670ae68e7c07',checkedAt:'2026-09-04T23:00:00.000Z',
  reception:{applicationFrom:'2026-09-07',applicationTo:'2026-09-30',closesAt:null,deadlinePrecision:'date'},
  evidence:{purpose:'관광지의 물리적·정보적·콘텐츠 접근성을 개선하고 관광교통·민간시설·안내거점·여행상품을 연계한 무장애 관광환경 조성',audience:'광역(시·도) 및 기초자치단체(시·군·자치구). 열린관광지는 원칙적으로 2~4개 관광지점을 권역으로 신청하며 일부 기존 열린관광지·플러스 유형은 단일 지점 가능. 동일 내용 국가보조금 중복지원 불가, 제주는 국비 제외. 민간시설·사업자는 구성에 참여할 수 있으나 직접 신청자가 아님',support:'열린관광지 30개 지점, 지점당 국비 2.5억원. 연계성 강화 1개 권역, 3년간 국비 최대 40억원(10억·15억·15억). 두 분야 모두 국비의 100% 이상 지방비 매칭이며 선정규모·국비는 예산확정·재정협의에 따라 변경 가능',application:'2026년 9월 7일~9월 30일. 공문과 우편을 모두 접수기간 내 도착시켜야 함. 공문은 신청서·전체 전자파일, 우편은 사업계획서 1부·날인 확약서·증빙자료. 기초지자체는 소속 광역에도 공문 발송. 도착 마감시각은 안내서에 없어 날짜형으로 표시'},
},{
  sourceId:'touraz-kto',externalId:'1426',sourceUrl:uctfTourazUrl,
  title:'2026 울산 관광 인재 인턴십 지원사업 참여기업 모집',contentHash:'4338ef8ae0c0198f316dd22df15e9a15367e6f764c3ab8dc7da6fab7a1b2ce4b',detailHash:'ca712d2728286e748f22ec2b183ee5155e2289037a157eed9686be0937b3924d',checkedAt:'2026-09-04T23:45:00.000Z',
  reception:{applicationFrom:'2026-02-25',applicationTo:'2026-10-30',closesAt:'2026-10-30T09:00:00.000Z'},
  evidence:{purpose:'울산 관광스타트업·관광기업의 경영 안정과 지역 관광인재 정착을 위한 인턴 채용 인건비 지원',audience:'울산광역시 소재 관광사업체·관광스타트업 또는 울산관광기업지원센터 입주기업 중 최소3개월 채용계획이 있는 기업. 체납·면세사업자·임금체불 명단 공개 사업체, 근로자와 특수관계 또는 이전 사업주와 밀접한 관련성이 있는 경우 등 제외',support:'기업당 인턴 최대2명, 1명당 월150만원을 최대3개월 지원(기업당 이론상 최대900만원). 기업은 월 최저임금 이상을 선지급하고 지원금 외 인건비·4대보험료·법정수당 부담. 매월1일~말일 근무분만 지급하며 중도퇴사 월은 미지급',application:'2026년2월25일09시~10월30일18시, 예산 소진 시 조기마감 가능. 투어라즈 정책지원→공고/공모에서 온라인 신청서와 필수 증빙 업로드. 선정 뒤 인턴은 기업이 자체 채용하고 채용증빙·월별 지원금 증빙은 지정 이메일 제출'},
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
  return {status:'verified',reason:'공식 본문 4개 요건 확인 · 접수 상태는 별도 확인',checkedAt:a.checkedAt,sourceUrl:a.sourceUrl,evidence:a.evidence,reception:a.reception};
}
export async function detailFingerprint(html:string,format:'kosme'|'nipa'|'koat'='kosme'){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const kosmeBodies=format==='kosme'?[...clean.matchAll(/<div class="detail_text">([\s\S]*?)<\/div>/g)]:[];
  if(format==='kosme'&&(kosmeBodies.length!==1||/<div\b/i.test(kosmeBodies[0][1])))throw new Error('KOSME 본문 경계 확인 필요');
  const koatBodies=format==='koat'?[...clean.matchAll(/<td class="main">([\s\S]*?)<\/td>/g)]:[];
  if(format==='koat'&&(koatBodies.length!==1||/<table\b|<td\b/i.test(koatBodies[0][1])))throw new Error('KOAT 본문 경계 확인 필요');
  const body=format==='koat'?koatBodies[0][1]:format==='nipa'?clean.match(/<label[^>]*id="BSNS_ANNC_CONT_323-001"[^>]*>([\s\S]*?)<\/label>/)?.[1]:clean.match(/<div class="detail_text">([\s\S]*?)<\/div>/)?.[1];
  if(!body)throw new Error('본문 구조 확인 필요');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.replace(/\s+/g,' ').trim()));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function verifyGrantDetail(n:RecordIdentity,fetcher:typeof fetch=fetch,now=Date.now()):Promise<GrantVerification>{
  const result=verifyGrant(n,grantAudits,now);if(result.status!=='verified')return result;
  const audit=grantAudits.find(a=>a.sourceId===n.sourceId&&a.externalId===n.externalId)!;
  if(audit.sourceUrl===namhaeUrl){
    try{await verifyNamhaeEvidence(audit.detailHash,fetcher);return {...result,reason:'공식 본문·공고 첨부 4개 요건 확인 · 개인별 신청자격 별도 확인'};}
    catch(error){const message=error instanceof Error?error.message:'';const safe=['남해 본문 변경','남해 첨부 변경 또는 오류 응답','남해 공고문 첨부 연결 변경','남해 상세 필수항목 누락','남해 공고 제목 불일치','근거 HTTP 응답 오류','근거 크기 제한 초과'].includes(message)?message:'공식 근거 조회 지연 또는 구조 오류';return {status:'candidate',reason:`${safe} · 재검토 필요`};}
  }
  if(audit.sourceUrl===ripcSourceUrl){
    try{await verifyRipcEvidence(audit.detailHash,fetcher);return {...result,reason:'공식 본문·HWP 공고문 4개 요건 확인 · 관할지역·세부 제외업종·개인별 신청자격 별도 확인'};}
    catch(error){const message=error instanceof Error?error.message:'';const safe=['RIPC 본문 변경','RIPC 첨부 변경 또는 오류 응답','RIPC 공고문 첨부 연결 변경','RIPC 상세 필수항목 누락','RIPC 공고 제목 불일치','근거 HTTP 응답 오류','근거 크기 제한 초과'].includes(message)?message:'공식 근거 조회 지연 또는 구조 오류';return {status:'candidate',reason:`${safe} · 재검토 필요`};}
  }
  if(audit.sourceUrl===tourazUrl){
    try{await verifyTourazEvidence(audit.detailHash,fetcher);return {...result,reason:'공식 본문·공모안내서 4개 요건 확인 · 예산확정·개별 신청자격 별도 확인'};}
    catch(error){const message=error instanceof Error?error.message:'';const safe=['투어라즈 본문 변경','투어라즈 안내서 변경 또는 오류 응답','투어라즈 안내서 첨부 연결 변경','투어라즈 상세 필수항목 누락','투어라즈 공고 제목 불일치','근거 HTTP 응답 오류','근거 크기 제한 초과'].includes(message)?message:'공식 근거 조회 지연 또는 구조 오류';return {status:'candidate',reason:`${safe} · 재검토 필요`};}
  }
  if(audit.sourceUrl===uctfTourazUrl){
    try{await verifyUctfEvidence(audit.detailHash,fetcher);return {...result,reason:'공식 상세·재단 공고문 4개 요건 확인 · 예산소진·개별 적격성 별도 확인'};}
    catch(error){const message=error instanceof Error?error.message:'';const safe=['울산 관광 인턴십 본문 변경','울산 관광 인턴십 공고문 변경 또는 오류 응답','울산 관광 인턴십 상세 필수항목 누락','울산 관광 인턴십 공고 제목 불일치','울산 관광 인턴십 공고 ID 불일치','근거 HTTP 응답 오류','근거 크기 제한 초과'].includes(message)?message:'공식 근거 조회 지연 또는 구조 오류';return {status:'candidate',reason:`${safe} · 재검토 필요`};}
  }
  const formats:Record<string,'kosme'|'nipa'|'koat'>={
    'https://kdoctor.kosmes.or.kr/esgplatform/board/board13View.do?idx=1351':'kosme',
    'https://kdoctor.kosmes.or.kr/esgplatform/board/board13View.do?idx=1335':'kosme',
    'https://www.nipa.kr/home/2-2/16900':'nipa',
    'https://www.koat.or.kr/board/business/16460/view.do':'koat',
    'https://www.koat.or.kr/board/business/16431/view.do':'koat',
  };
  const format=formats[audit.sourceUrl];if(!format)return {status:'candidate',reason:'본문 대조 경로 미설정'};
  try{
    const r=await fetcher(audit.sourceUrl,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});
    if(!r.ok||await detailFingerprint(await r.text(),format)!==audit.detailHash)return {status:'candidate',reason:'본문 변경 또는 응답 오류 · 재검토 필요'};
    return result;
  }catch{return {status:'candidate',reason:'공식 본문 재확인 지연 · 검토 후보 유지'};}
}
export function grantReception(v:GrantVerification,now=Date.now()):Partial<{applicationFrom:string;applicationTo:string;opensAt:null;closesAt:string|null;deadlinePrecision:'date'|'time';status:'closed'|'open'|'unknown'|'upcoming';deadlineLabel:string}>{
  if(v.status!=='verified'||!v.reception)return {};
  const r=v.reception;
  const validDay=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  if(!validDay(r.applicationFrom)||!validDay(r.applicationTo)||r.applicationFrom>r.applicationTo)return {};
  const today=new Date(now+9*3600000).toISOString().slice(0,10);
  if(r.deadlinePrecision==='date'){
    const today=new Date(now+9*3600000).toISOString().slice(0,10);
    return {...r,closesAt:null,opensAt:null,status:r.applicationFrom>today?'upcoming':r.applicationTo<today?'closed':r.applicationTo===today?'unknown':'open',deadlineLabel:`${r.applicationTo} · 마감시각 원문 확인`};
  }
  const end=Date.parse(r.closesAt);
  if(!Number.isFinite(end)||new Date(end+9*3600000).toISOString().slice(0,10)!==r.applicationTo)return {};
  return {...r,opensAt:null,status:r.applicationFrom>today?'upcoming':Date.parse(r.closesAt)<now?'closed':'open',deadlineLabel:`${r.applicationTo} ${new Date(Date.parse(r.closesAt)+9*3600000).toISOString().slice(11,16)} (본문 확인)`};
}

// Always project from unmodified source facts, never from a previous projection.
export function effectiveGrantFacts<T extends {audience?:string;status?:string}>(original:T,v?:GrantVerification,now=Date.now()){
  const grantVerification=currentGrantVerification(v,now);
  const reception=grantReception(grantVerification,now);
  return {...original,...reception,
    ...(original.status==='closed'?{status:'closed'}:{}),
    audience:grantVerification.status==='verified'&&grantVerification.evidence?grantVerification.evidence.audience:original.audience,
    grantVerification};
}
