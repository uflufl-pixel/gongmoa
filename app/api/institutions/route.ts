import {centralInstitutions,registerCentralInstitutions} from '@/db/central-institutions';
export async function GET(){
  try{return Response.json(await centralInstitutions());}
  catch{return Response.json({error:'기관 목록 조회 실패'},{status:503});}
}
export async function POST(){
  try{await registerCentralInstitutions();return Response.json(await centralInstitutions());}
  catch{return Response.json({error:'기관 등록 실패'},{status:503});}
}
