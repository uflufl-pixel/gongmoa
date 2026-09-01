import { listRecentChecks } from '@/db/queries';
import { syncOfficialSources } from '@/db/sync';

export async function GET() {
  try { return Response.json({items:await listRecentChecks()}); }
  catch(error) { return Response.json({error:error instanceof Error?error.message:'Unable to load checks'},{status:503}); }
}

export async function POST() {
  try {
    const results=await syncOfficialSources();
    return Response.json({ok:true,results,finishedAt:new Date().toISOString()});
  } catch(error) {
    return Response.json({error:error instanceof Error?error.message:'Sync failed'},{status:500});
  }
}
