import {syncOfficialSources} from '@/db/sync';
export async function POST(request:Request){
  if(new URL(request.url).search)return Response.json({error:'Parameters not allowed'},{status:400});
  try{return Response.json(await syncOfficialSources(['arko-board']));}
  catch{return Response.json({error:'아르코 수집 저장 확인 필요'},{status:500});}
}
