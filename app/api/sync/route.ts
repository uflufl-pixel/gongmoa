import { listRecentChecks } from '@/db/queries';
import { SYNC_BATCHES, syncOfficialSources } from '@/db/sync';
import {enrichBizinfoBatch} from '@/db/bizinfo-details';

export async function GET() {
  try { return Response.json({items:await listRecentChecks()}); }
  catch(error) { return Response.json({error:error instanceof Error?error.message:'Unable to load checks'},{status:503}); }
}

export async function POST(request:Request) {
  try {
    const value=new URL(request.url).searchParams.get('batch');
    const batch=value===null?0:Number.parseInt(value,10);
    if(!Number.isInteger(batch)||batch<0||batch>=SYNC_BATCHES.length) return Response.json({error:'Invalid sync batch'},{status:400});
    const sync=await syncOfficialSources(SYNC_BATCHES[batch]);
    const enrichment=batch===0?await enrichBizinfoBatch():null;
    return Response.json({ok:true,...sync,enrichment,batch,batchCount:SYNC_BATCHES.length,finishedAt:new Date().toISOString()});
  } catch(error) {
    return Response.json({error:error instanceof Error?error.message:'Sync failed'},{status:500});
  }
}
