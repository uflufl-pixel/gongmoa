import {and,eq} from 'drizzle-orm';
import {getDb} from '@/db';
import {notices} from '@/db/schema';
import {ensureSeeded} from '@/db/queries';
import {parseBojoItems,upsertCollected} from '@/db/sync';
import {portalDetailRow,validReconcileIds} from '@/lib/bojo-portal-detail';

export async function POST(request:Request){
  let ids:unknown;
  try{ids=(await request.json() as {ids?:unknown}).ids;}catch{return Response.json({error:'JSON 입력 오류'},{status:400});}
  if(!validReconcileIds(ids))return Response.json({error:'공식 국고 공고 ID를 1~5개 입력해야 합니다.'},{status:400});
  await ensureSeeded();
  const results=[];
  for(const id of [...new Set(ids)]){
    try{
      const response=await fetch('https://www.bojo.go.kr/da/retrieveTaskReqstPopAjax.do',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded; charset=UTF-8',accept:'application/json'},body:new URLSearchParams({bsnsyear:'',nttId:id}),signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error('공식 원문 HTTP '+response.status);
      const row=portalDetailRow(await response.json(),id);
      if(!row){results.push({id,outcome:'skipped',reason:'원문 접수 종료 또는 상태 미확인'});continue;}
      const item=parseBojoItems([row])[0];
      if(!item){results.push({id,outcome:'skipped',reason:'접수기간 종료'});continue;}
      const existing=(await getDb().select().from(notices).where(and(eq(notices.sourceId,'bojo'),eq(notices.externalId,id))).limit(1))[0];
      // The popup names the announcing institution, not necessarily its parent ministry.
      delete item.ministry;
      item.group=existing?.group||'기관 유형 미확인';
      item.region=existing?.region||null;
      item.sourceName='보조금통합포털 공식 원문';
      if(existing)item.sourceUrl=existing.sourceUrl;
      const collection=await upsertCollected([item]);
      results.push({id,outcome:'success',collection});
    }catch(error){results.push({id,outcome:'failed',message:error instanceof Error?error.message:'원문 보완 실패'});}
  }
  return Response.json({results});
}
