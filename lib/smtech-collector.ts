export const smtechSource={id:'smtech-tipa',institutionId:'public-298',name:'SMTECH 공식 사업공고',url:'https://www.smtech.go.kr/front/ifg/no/notice02_list.do'};
const detailUrl='https://www.smtech.go.kr/front/ifg/no/notice02_detail.do?ancmId=S02877&aplySn=1&buclCd=S9171&dtlAncmSn=1';
const title='2026년 제6차 중소기업 R&D 전담은행 투자지원 추천기업(방산 및 전략기술) 모집 공고';
const externalId='S02877:S9171:1:1';
function invalid():never{throw new Error('SMTECH 사업공고 구조 확인 필요');}
function plain(value:string){return value.replace(/<!--[^]*?-->/g,' ').replace(/<script\b[^>]*>[^]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
export async function fetchSmtechBundle(fetcher:typeof fetch=fetch){
  const signal=AbortSignal.timeout(20000),headers={accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'};
  const list=await fetcher(smtechSource.url,{headers,redirect:'manual',signal});if(!list.ok)throw new Error(`SMTECH HTTP ${list.status}`);const listText=await list.text();if(listText.length<50_000||listText.length>300_000)invalid();
  const detail=await fetcher(detailUrl,{headers,redirect:'manual',signal});if(!detail.ok)throw new Error(`SMTECH HTTP ${detail.status}`);const detailText=await detail.text();if(detailText.length<50_000||detailText.length>350_000)invalid();
  return JSON.stringify({list:listText,detail:detailText});
}
export function collectSmtechBundle(input:string,knownIds:string[]=[],now=new Date()){
  let bundle:{list?:unknown;detail?:unknown};try{bundle=JSON.parse(input);}catch{invalid();}if(typeof bundle.list!=='string'||typeof bundle.detail!=='string')invalid();
  if(!bundle.list.includes('<th>시스템구분</th>')||!bundle.list.includes('<th>접수기간</th>')||!bundle.list.includes('<th>공고일</th>'))invalid();
  const rows=[...bundle.list.matchAll(/<tr\b[^>]*>([^]*?)<\/tr>/g)].map(x=>x[1]).filter(x=>/<a\b[^>]*class="board"/.test(x));if(rows.length!==15)invalid();
  const seen=new Set<string>();let target:string|null=null;
  for(const row of rows){
    const a=row.match(/<a\b[^>]*href="([^"]+)"[^>]*class="board"[^>]*>([^]*?)<\/a>/);if(!a)invalid();
    const href=a[1].replace(/;jsessionid=[A-Za-z0-9_.-]+(?=\?)/,'').replaceAll('&amp;','&'),u=new URL(href,smtechSource.url);
    const keys=['ancmId','buclCd','dtlAncmSn','aplySn'].map(k=>u.searchParams.get(k)||'');
    if(u.pathname==='/front/ifg/no/notice02_detail.do'&&keys.every(Boolean)){
      const id=`${keys[0]}:${keys[1]}:${keys[2]}:${keys[3]}`;if(seen.has(id))invalid();seen.add(id);if(plain(a[2])===title)target=id;
    }
  }
  if(target!==externalId)invalid();
  const detail=bundle.detail as string;
  const clean=plain(detail),field=(name:string)=>plain(detail.match(new RegExp(`<th>${name}<\\/th>\\s*<td[^>]*>([^]*?)<\\/td>`))?.[1]||'');
  if(field('제목')!==title||field('사업명')!=='전담은행 투자설명회(IR)'||field('시행기관')!=='중소기업기술정보진흥원'||field('시작일자')!=='2026-09-03'||field('종료일자')!=='2026-09-28')invalid();
  if(!clean.includes('중소기업 R&D 수행기업')||!clean.includes('12대 국가전략기술')||!detail.includes("cfn_AtchFileDownload('EC1A1CEE2A787A200CE45338FD3959C5'")||!detail.includes('전담은행 투자지원프로그램 FAQ.hwp'))invalid();
  const item={sourceId:smtechSource.id,externalId,institution:'중소기업기술정보진흥원',group:'공사·공단',title,category:'투자·금융연계 지원',audience:'중소기업 R&D 수행기업 중 방산 또는 12대 국가전략기술 분야 중소기업',region:null,sourceName:smtechSource.name,sourceUrl:detailUrl,announcedFrom:'2026-09-03',applicationFrom:'2026-09-03',applicationTo:'2026-09-28',opensAt:new Date('2026-09-03T00:00:00+09:00'),closesAt:null,deadlineLabel:'2026-09-03 ~ 2026-09-28 · 마감시각 원문 확인',status:'open',ministry:'중소벤처기업부',applicationMethod:'SMTECH 공고의 모집 안내·FAQ·동의서 확인 후 신청'};
  return {items:knownIds.includes(externalId)||now.getTime()<Date.parse('2026-09-29T00:00:00+09:00')?[item]:[],parsedRows:rows.length};
}
