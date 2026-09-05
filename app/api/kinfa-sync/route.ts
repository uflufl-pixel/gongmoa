import {syncOfficialSources} from '../../../db/sync';
export async function POST(){
  try{return Response.json(await syncOfficialSources(['kinfa-board']));}
  catch(error){return Response.json({error:error instanceof Error?error.message:'서민금융진흥원 수집 실패'},{status:500});}
}
