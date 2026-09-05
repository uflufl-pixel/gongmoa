export const koregSource={id:'koreg-opportunities',institutionId:'public-296',name:'신용보증재단중앙회 수행 장기접수 3건 감사',url:'https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000119801'};
export const koregOpportunityIds=['PBLN_000000000119801','PBLN_000000000119802','PBLN_000000000117127'] as const;
const ids=koregOpportunityIds;
const urls=ids.map(id=>`https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=${id}`);
function invalid():never{throw new Error('신용보증재단중앙회 수행사업 구조 확인 필요');}
function plain(value:string){return value.replace(/<!--[^]*?-->/g,' ').replace(/<script\b[^>]*>[^]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();}
function labeled(html:string,label:string){const match=html.match(new RegExp(`<span[^>]*class="s_title"[^>]*>${label}<\\/span>\\s*<div[^>]*class="txt"[^>]*>([^]*?)<\\/div>`));return plain(match?.[1]||'');}
function titleOf(html:string){const headings=[...html.matchAll(/<h[1-4][^>]*>([^]*?)<\/h[1-4]>/gi)].map(x=>plain(x[1])).filter(Boolean);return headings.find(x=>x!=='지원사업 공고'&&!x.startsWith('#'))||'';}
export async function fetchKoregBundle(fetcher:typeof fetch=fetch){
  const pages=await Promise.all(urls.map(async url=>{const response=await fetcher(url,{headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'},redirect:'manual',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`KOREG 수행사업 ${new URL(url).searchParams.get('pblancId')} HTTP ${response.status}`);const html=await response.text();if(html.length<50_000||html.length>250_000)invalid();return html;}));
  return JSON.stringify({pages});
}
export function collectKoregBundle(input:string,knownIds:string[]=[],now=new Date()){
  let bundle:{pages?:unknown};try{bundle=JSON.parse(input);}catch{invalid();}if(!Array.isArray(bundle.pages)||bundle.pages.length!==3||bundle.pages.some(x=>typeof x!=='string'))invalid();
  const pages=bundle.pages as string[];
  const expected=[
    {id:ids[0],title:'2026년 소상공인(개인사업자) 비즈플러스카드 지원사업 시행 공고',ministry:'중소벤처기업부',period:'예산 소진시까지',audience:'NCB 595~964점, 업력 6개월 이상이며 매출액 기준을 충족하는 개인사업자 소상공인',support:'카드한도 소상공인당 최대 1,000만원',method:'지역신용보증재단 보증신청 후 IBK기업은행 카드 발급신청',applicationTo:null},
    {id:ids[1],title:'2026년 소상공인(법인사업자) 비즈플러스카드 지원사업 시행 공고',ministry:'중소벤처기업부',period:'예산 소진시까지',audience:'NCB 595~964점, 업력 6개월 이상이며 매출액 기준을 충족하는 법인사업자 소상공인',support:'카드한도 소상공인당 최대 1,000만원',method:'지역신용보증재단 보증신청 후 IBK기업은행 카드 발급신청',applicationTo:null},
    {id:ids[2],title:'2026년 관광진흥개발기금 신용보증부 운영자금 특별융자 지원 지침 공고',ministry:'문화체육관광부',period:'2026.01.02 ~ 2026.11.13',audience:'관광진흥법상 관광사업 등을 운영하는 중소기업. 소액지원은 신청금액 2천만원 이하',support:'최대 2억원 특별융자 · 3년 거치 3년 분할상환',method:'관할 지역신용보증재단 영업점 방문 신청',applicationTo:'2026-11-13'},
  ] as const;
  const items=expected.flatMap((e,index)=>{
    const html=pages[index],overview=labeled(html,'사업개요'),method=labeled(html,'사업신청 방법');
    if(titleOf(html)!==e.title||labeled(html,'소관부처·지자체')!==e.ministry||labeled(html,'사업수행기관')!=='신용보증재단중앙회'||labeled(html,'신청기간')!==e.period||!overview.includes(e.support.split(' · ')[0]))invalid();
    if(e.id!==ids[2]&&!method.includes('지역신용보증재단에 보증신청 후 IBK기업은행에 카드 발급신청'))invalid();
    if(e.id===ids[0]&&(!overview.includes('개인사업자')||overview.includes('법인사업자')))invalid();
    if(e.id===ids[1]&&!overview.includes('법인사업자'))invalid();
    if(e.id===ids[2]&&(!overview.includes('3년 거치 3년 분할상환')||!method.includes('방문')))invalid();
    const ended=e.applicationTo&&now.getTime()>=Date.parse('2026-11-14T00:00:00+09:00');if(ended&&!knownIds.includes(e.id))return [];
    const deadlineDay=e.applicationTo&&now.getTime()>=Date.parse('2026-11-13T00:00:00+09:00');
    return [{sourceId:'bizinfo',externalId:e.id,institution:'신용보증재단중앙회',group:'공사·공단',title:e.title,category:e.id===ids[2]?'융자·금융지원(상환 필요)':'보증·카드 금융지원',audience:e.audience,region:null,sourceName:'기업마당 · 신용보증재단중앙회 수행',sourceUrl:urls[index],announcedFrom:null,applicationFrom:e.id===ids[2]?'2026-01-02':null,applicationTo:e.applicationTo,opensAt:null,closesAt:null,deadlineLabel:e.applicationTo?`${e.applicationTo} · 마감시각 원문 확인`:'예산 소진 시까지 · 접수 가능 여부 확인',status:ended?'closed':deadlineDay?'unknown':e.applicationTo?'open':'unknown',ministry:e.ministry,applicationMethod:e.method}];
  });
  return {items,parsedPages:pages.length};
}
