import {syncOfficialSources} from '../../../db/sync';
export async function POST(request:Request){if(new URL(request.url).search)return Response.json({error:'Query parameters are not accepted'},{status:400});try{return Response.json(await syncOfficialSources(['kofpi-support']));}catch(error){return Response.json({error:error instanceof Error?error.message:'한국임업진흥원 지원사업 수집 실패'},{status:500});}}
