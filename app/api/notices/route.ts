import { listNotices, listSources } from '@/db/queries';
import {withBizinfoDetails} from '@/db/bizinfo-details';
import {withKoccaDetails} from '@/db/kocca-details';
import {isCollectedRecord} from '@/lib/data-quality';
import {verifyGrantDetail,grantReception} from '@/lib/grant-verification';
import {tourazCandidate,tourazReception} from '@/lib/touraz-download';
import {arkoCandidate} from '@/lib/arko-collector';
import {kawfCandidate} from '@/lib/kawf-collector';

function relationKey(institution:string,title:string) {
  const normalizedTitle=title.toLowerCase()
    .replace(/\[[^\]]+\]|\([^)]*공고[^)]*\)/g,' ')
    .replace(/20\d{2}년|제?\d+차|재공고|수정공고|추가공고|연장공고|공고문?|모집/g,' ')
    .replace(/[^0-9a-z가-힣]/g,'');
  return normalizedTitle.length>=8?`${institution.replace(/\s/g,'')}:${normalizedTitle}`:'';
}

const isObviousNonGrant=(title:string)=>/(채용|임원|상임이사|이사장|기관장|원장|본부장|강사|매니저|후보자|위원|참여단|입찰|개찰결과|공시송달)/.test(title);

export async function GET() {
  try {
    const [baseItems, sourceItems] = await Promise.all([listNotices(true), listSources()]);
    const items=(await withKoccaDetails(await withBizinfoDetails(baseItems))).filter(i=>i.sourceId!=='touraz-kto'||tourazCandidate(i.title)).map(i=>{
      if(i.sourceId!=='touraz-kto')return i;
      const sourceReceptionState=i.status==='closed'?'종료':i.status==='pending'?'대기':'접수';
      return {...i,sourceReceptionState,deadlinePrecision:'date' as const,status:tourazReception(sourceReceptionState,i.applicationFrom||'',i.applicationTo||'')};
    });
    const visibleItems=items.filter(item=>isCollectedRecord(item)&&!isObviousNonGrant(item.title)&&(item.sourceId!=='arko-board'||arkoCandidate(item.title))&&(item.sourceId!=='kawf-board'||kawfCandidate(item.title)));
    const groups=new Map<string,typeof items>();
    for(const item of visibleItems) { const key=relationKey(item.institution,item.title); if(key) groups.set(key,[...(groups.get(key)||[]),item]); }
    const enriched=await Promise.all(visibleItems.map(async item=>{const related=groups.get(relationKey(item.institution,item.title))||[];const grantVerification=await verifyGrantDetail(item);return {...item,...grantReception(grantVerification),audience:grantVerification.status==='verified'?grantVerification.evidence!.audience:item.audience,grantVerification,relatedCount:Math.max(0,related.length-1),relatedSources:[...new Set(related.map(x=>x.sourceName))]};}));
    return Response.json({ items: enriched, sources: sourceItems, generatedAt: new Date().toISOString(), mode: 'live-db' });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Database unavailable' }, { status: 503 });
  }
}
