import { listNotices, listSources } from '@/db/queries';

function relationKey(institution:string,title:string) {
  const normalizedTitle=title.toLowerCase()
    .replace(/\[[^\]]+\]|\([^)]*공고[^)]*\)/g,' ')
    .replace(/20\d{2}년|제?\d+차|재공고|수정공고|추가공고|연장공고|공고문?|모집/g,' ')
    .replace(/[^0-9a-z가-힣]/g,'');
  return normalizedTitle.length>=8?`${institution.replace(/\s/g,'')}:${normalizedTitle}`:'';
}

const isObviousNonGrant=(title:string)=>/(채용|임원|상임이사|이사장|기관장|원장|본부장|강사|후보자|위원|참여단|입찰|공시송달)/.test(title);

export async function GET() {
  try {
    const [items, sourceItems] = await Promise.all([listNotices(), listSources()]);
    const visibleItems=items.filter(item=>!isObviousNonGrant(item.title));
    const groups=new Map<string,typeof items>();
    for(const item of visibleItems) { const key=relationKey(item.institution,item.title); if(key) groups.set(key,[...(groups.get(key)||[]),item]); }
    const enriched=visibleItems.map(item=>{const related=groups.get(relationKey(item.institution,item.title))||[];return {...item,relatedCount:Math.max(0,related.length-1),relatedSources:[...new Set(related.map(x=>x.sourceName))]};});
    return Response.json({ items: enriched, sources: sourceItems, generatedAt: new Date().toISOString(), mode: 'live-db' });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Database unavailable' }, { status: 503 });
  }
}
