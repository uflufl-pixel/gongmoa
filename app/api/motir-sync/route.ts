import {syncOfficialSources} from '../../../db/sync';

export async function POST(request:Request){
  if(new URL(request.url).search)return Response.json({error:'Query parameters are not accepted'},{status:400});
  try{return Response.json(await syncOfficialSources(['motir-board']));}
  catch(error){return Response.json({error:error instanceof Error?error.message:'산업통상부 사업공고 수집 실패'},{status:500});}
}
