import {syncOfficialSources} from '@/db/sync';
export async function POST(request:Request){
  if(new URL(request.url).search)return Response.json({error:'Parameters not allowed'},{status:400});
  try{return Response.json(await syncOfficialSources(['touraz-kto']));}
  catch{return Response.json({error:'투어라즈 수집 저장 확인 필요'},{status:500});}
}
