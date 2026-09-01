import { listBookmarks, setBookmark } from '@/db/queries';

function validKey(value:unknown) { return typeof value==='string' && /^[a-zA-Z0-9_-]{12,80}$/.test(value); }

export async function GET(request:Request) {
  const deviceKey=new URL(request.url).searchParams.get('deviceKey');
  if(!validKey(deviceKey)) return Response.json({error:'Invalid device key'},{status:400});
  return Response.json({items:await listBookmarks(deviceKey!)});
}

export async function POST(request:Request) {
  const body=await request.json() as {deviceKey?:unknown;noticeId?:unknown;saved?:unknown};
  if(!validKey(body.deviceKey)||typeof body.noticeId!=='string'||typeof body.saved!=='boolean') return Response.json({error:'Invalid request'},{status:400});
  await setBookmark(body.deviceKey as string,body.noticeId,body.saved);
  return Response.json({ok:true});
}
