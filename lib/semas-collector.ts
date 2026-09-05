export const semasSource={id:'semas-loan',institutionId:'public-295',name:'소상공인시장진흥공단 정책자금 공지',url:'https://ols.semas.or.kr/ols/man/SMAN051M/search.do'};
const detailUrl='https://ols.semas.or.kr/ols/man/SMAN052M/page.do?bltwtrSeq=402&bbsTypeCd=01';
const title='2026년 9월 일시적경영애로자금(직접대출) 신청안내';
function invalid():never{throw new Error('소상공인 정책자금 공지 구조 확인 필요');}
function plain(value:string){return value.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
export async function fetchSemasBundle(fetcher:typeof fetch=fetch){
  const signal=AbortSignal.timeout(20000);
  const list=await fetcher(semasSource.url,{method:'POST',body:'bltwtrClcd=&bltwtrTitNm=&searchStd=1&pageNo=1',redirect:'manual',signal,headers:{accept:'application/json','content-type':'application/x-www-form-urlencoded','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});
  if(!list.ok)throw new Error(`SEMAS HTTP ${list.status}`);const listText=await list.text();if(listText.length>200_000)invalid();
  const detail=await fetcher(detailUrl,{redirect:'manual',signal,headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});
  if(!detail.ok)throw new Error(`SEMAS HTTP ${detail.status}`);const detailText=await detail.text();if(detailText.length>300_000)invalid();
  return JSON.stringify({list:listText,detail:detailText});
}
export function collectSemasBundle(input:string,knownIds:string[]=[],now=new Date()){
  let bundle:{list?:unknown;detail?:unknown};try{bundle=JSON.parse(input);}catch{invalid();}
  if(typeof bundle.list!=='string'||typeof bundle.detail!=='string')invalid();
  let data:{result?:Array<Record<string,unknown>>;pagination?:Record<string,unknown>};try{data=JSON.parse(bundle.list);}catch{invalid();}
  if(!Array.isArray(data.result)||data.result.length!==10||data.pagination?.pageNo!=='1'||data.pagination?.pageSize!==10||Number(data.pagination?.totalCount)<10)invalid();
  const seen=new Set<string>();for(const row of data.result){
    const id=String(row.bltwtrSeq||'');if(!/^[1-9]\d*$/.test(id)||seen.has(id)||row.bbsTypeCd!=='01'||typeof row.bltwtrTitNm!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(String(row.frstRegDt||'')))invalid();seen.add(id);
  }
  const listed=data.result.find(row=>row.bltwtrSeq===402);if(!listed||listed.bltwtrTitNm!==title||listed.bltwtrClcd!=='대출정보'||listed.loanSeCdNm!=='직접대출'||listed.frstRegDt!=='2026-09-04')invalid();
  const clean=bundle.detail.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const foundTitle=plain(clean.match(/<p class="view_title">([\s\S]*?)<\/p>/)?.[1]||'');
  const body=plain(clean.match(/<div id="cntnDiv"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'');
  if(foundTitle!==title||!body.includes('연매출 1억 4백만원 미만')||!body.includes('업력 7년 미만')||!body.includes('2026년 9월 7일 (월) 10:00 ~ 예산 소진 시까지')||!body.includes('대출금 조기회수')||!clean.includes('fnDownFile(1)')||!clean.includes('fnDownFile(2)'))invalid();
  if(!/fnDownFile\(bltwtrFlSeq\)[\s\S]*?\.val\('402'\)[\s\S]*?\.val\('01'\)/.test(bundle.detail))invalid();
  const start=new Date('2026-09-07T10:00:00+09:00'),known=new Set(knownIds);
  const item={sourceId:semasSource.id,externalId:'402',institution:'소상공인시장진흥공단',group:'공사·공단',title,category:'융자·금융지원(상환 필요)',audience:'연매출 1억400만원 미만·업력7년 미만이며 일시적 경영애로 사유가 있는 소상공인. 세금체납 등 제한·상환능력 심사 별도',region:null,sourceName:semasSource.name,sourceUrl:detailUrl,announcedFrom:'2026-09-04',applicationFrom:'2026-09-07',applicationTo:null,opensAt:start,closesAt:null,deadlineLabel:'2026-09-07 10:00부터 · 예산 소진 시까지',status:now<start?'upcoming':'unknown',ministry:'중소벤처기업부',applicationMethod:'소상공인 정책자금 사이트에서 직접대출 신청 · 신청안내 PDF와 신청서식 확인'};
  return {items:known.has('402')||now.getTime()<Date.parse('2027-01-01T00:00:00+09:00')?[item]:[],parsedRows:data.result.length};
}
