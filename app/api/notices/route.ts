import { listNotices, listSources } from '@/db/queries';

function relationKey(institution:string,title:string) {
  const normalizedTitle=title.toLowerCase()
    .replace(/\[[^\]]+\]|\([^)]*공고[^)]*\)/g,' ')
    .replace(/20\d{2}년|제?\d+차|재공고|수정공고|추가공고|연장공고|공고문?|모집/g,' ')
    .replace(/[^0-9a-z가-힣]/g,'');
  return normalizedTitle.length>=8?`${institution.replace(/\s/g,'')}:${normalizedTitle}`:'';
}

export async function GET() {
  try {
    const [items, sourceItems] = await Promise.all([listNotices(), listSources()]);
    const groups=new Map<string,typeof items>();
    for(const item of items) { const key=relationKey(item.institution,item.title); if(key) groups.set(key,[...(groups.get(key)||[]),item]); }
    const enriched=items.map(item=>{const related=groups.get(relationKey(item.institution,item.title))||[];return {...item,relatedCount:Math.max(0,related.length-1),relatedSources:[...new Set(related.map(x=>x.sourceName))]};});
    return Response.json({ items: enriched, sources: sourceItems, generatedAt: new Date().toISOString(), mode: 'live-db' });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Database unavailable' }, { status: 503 });
  }
}
