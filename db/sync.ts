import { eq } from 'drizzle-orm';
import { getDb } from './index';
import { ensureSeeded } from './queries';
import { sourceChecks, sources } from './schema';

const decoder=(value:string)=>value.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();

async function sha256(value:string) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}

async function inspectSource(source:{id:string;url:string;name:string}) {
  const startedAt=new Date();
  try {
    const fetchUrl=source.id==='bojo'?'https://www.bojo.go.kr/':source.url;
    const response=await fetch(fetchUrl,{headers:{accept:'text/html,application/xhtml+xml,application/json','user-agent':'GongmoaSourceMonitor/1.0 (+https://gongmoa.uflufl.chatgpt.site)'},signal:AbortSignal.timeout(12000),redirect:'follow'});
    const body=await response.text();
    const sample=body.slice(0,1_000_000);
    const titleMatch=sample.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const keywordHits=(sample.match(/공모|지원사업|사업공고|모집/g)||[]).length;
    return {id:crypto.randomUUID(),sourceId:source.id,outcome:response.ok?'success':'http_error',statusCode:response.status,contentHash:await sha256(sample),contentBytes:new TextEncoder().encode(body).byteLength,keywordHits,pageTitle:titleMatch?decoder(titleMatch[1]).slice(0,200):source.name,message:response.ok?null:`HTTP ${response.status}`,startedAt,finishedAt:new Date()};
  } catch(error) {
    return {id:crypto.randomUUID(),sourceId:source.id,outcome:'fetch_error',statusCode:null,contentHash:null,contentBytes:null,keywordHits:null,pageTitle:source.name,message:error instanceof Error?error.message.slice(0,300):'Fetch failed',startedAt,finishedAt:new Date()};
  }
}

export async function syncOfficialSources() {
  await ensureSeeded();
  const db=getDb();
  const sourceItems=await db.select({id:sources.id,url:sources.url,name:sources.name}).from(sources);
  const results=await Promise.all(sourceItems.map(inspectSource));
  for(const result of results) {
    await db.insert(sourceChecks).values(result);
    await db.update(sources).set({status:result.outcome==='success'?'connected':'attention',lastSuccessAt:result.outcome==='success'?result.finishedAt:undefined}).where(eq(sources.id,result.sourceId));
  }
  return results;
}
