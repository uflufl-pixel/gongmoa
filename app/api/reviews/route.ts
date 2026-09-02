import { listNoticeReviews, setNoticeReview } from '@/db/queries';

export async function GET() {
  try { return Response.json({items:await listNoticeReviews()}); }
  catch(error) { return Response.json({error:error instanceof Error?error.message:'Unable to load reviews'},{status:503}); }
}

export async function POST(request:Request) {
  try {
    const body=await request.json() as {noticeId?:string;decision?:string;note?:string|null};
    if(!body.noticeId||!['approved','excluded'].includes(body.decision||'')) return Response.json({error:'Invalid review'},{status:400});
    await setNoticeReview(body.noticeId,body.decision as 'approved'|'excluded',body.note?.slice(0,500)||null);
    return Response.json({ok:true});
  } catch(error) { return Response.json({error:error instanceof Error?error.message:'Unable to save review'},{status:500}); }
}
