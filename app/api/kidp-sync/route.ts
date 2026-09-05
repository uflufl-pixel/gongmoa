import {syncOfficialSources} from '../../../db/sync';
export async function POST(request:Request){if(new URL(request.url).search)return Response.json({error:'Query parameters are not accepted'},{status:400});try{return Response.json(await syncOfficialSources(['kidp-finance']));}catch(error){return Response.json({error:error instanceof Error?error.message:'한국디자인진흥원 금융지원 수집 실패'},{status:500});}}
