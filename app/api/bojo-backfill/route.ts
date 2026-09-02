import { backfillStatus, backfillStep } from '@/db/bojo-backfill';
export async function GET() {
  try { return Response.json(await backfillStatus()); }
  catch { return Response.json({error:'전체 수집 상태를 불러오지 못했습니다.'},{status:503}); }
}
export async function POST() {
  try { return Response.json(await backfillStep()); }
  catch(error) { return Response.json({error:error instanceof Error?error.message:'전체 수집 실패'},{status:503}); }
}
