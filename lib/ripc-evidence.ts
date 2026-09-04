// @ts-expect-error Native Node tests use explicit extensions.
import {evidenceHash,readEvidenceBytes} from './namhae-evidence.ts';

export const ripcSourceUrl='https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000126087';
export const ripcEvidenceUrl='https://pms.ripc.org/pms/biz/applicant/notice/info.do?noticeSeq=4913&bizYear=2026';
export const ripcAttachment='https://pms.ripc.org/kms/notice/attachFileDown.do?attachSeq=14666';
export const ripcAttachmentHash='e971f0582ddda103c0920cc1f3b36b047f30cc151c1cc71d4cc02b29c8157217';
const ripcTitle='[강원남부 센터] [강원남부] 2026년 소상공인 IP창출지원 레시피 특허 출원 지원사업 모집 공고';

export function ripcCanonical(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
  const names=[...clean.matchAll(/<th>공고명<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim());
  if(names.length!==1||names[0]!==ripcTitle)throw Error('RIPC 공고 제목 불일치');
  const bodies=[...clean.matchAll(/<div id="elem"[^>]*>([\s\S]*?)<\/div>/g)];
  if(bodies.length!==1||/<div\b/i.test(bodies[0][1]))throw Error('RIPC 상세 본문 경계 오류');
  const body=bodies[0][1].replace(/\s+/g,' ').trim();
  for(const phrase of ['지원 대상','지원 내용','접수 기간','신청 방법','제출 서류'])if(!body.includes(phrase))throw Error('RIPC 상세 필수항목 누락');
  const attachments=[...new Set([
    ...[...clean.matchAll(/attachSeq=(\d+)/g)].map(m=>m[1]),
    ...[...clean.matchAll(/data-attach-seq=["'](\d+)["']/g)].map(m=>m[1]),
  ])].sort();
  if(!attachments.includes('14666')||!attachments.includes('14667'))throw Error('RIPC 공고문 첨부 연결 변경');
  return JSON.stringify({title:ripcTitle,body,attachments});
}

export async function verifyRipcEvidence(detailHash:string,fetcher:typeof fetch=fetch,attachmentHash=ripcAttachmentHash){
  const signal=AbortSignal.timeout(20000),init={signal,redirect:'manual' as const};
  const detail=await readEvidenceBytes(await fetcher(ripcEvidenceUrl,init));
  if(await evidenceHash(new TextEncoder().encode(ripcCanonical(new TextDecoder().decode(detail))))!==detailHash)throw Error('RIPC 본문 변경');
  const file=await readEvidenceBytes(await fetcher(ripcAttachment,init));
  const ole=[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1];
  if(!ole.every((x,i)=>file[i]===x)||await evidenceHash(file)!==attachmentHash)throw Error('RIPC 첨부 변경 또는 오류 응답');
}
