import {syncOfficialSources} from '../../../db/sync';
export async function POST(){try{return Response.json(await syncOfficialSources(['semas-loan']));}catch(error){return Response.json({error:error instanceof Error?error.message:'소상공인 정책자금 수집 실패'},{status:500});}}
