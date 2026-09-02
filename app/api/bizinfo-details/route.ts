import {detailStatus,enrichBizinfoBatch} from '@/db/bizinfo-details';
export async function GET(){
  try{return Response.json(await detailStatus());}
  catch{return Response.json({error:'상세 수집 상태 조회 실패'},{status:503});}
}
export async function POST(){
  try{return Response.json(await enrichBizinfoBatch());}
  catch{return Response.json({error:'상세 수집 실행 실패'},{status:503});}
}
