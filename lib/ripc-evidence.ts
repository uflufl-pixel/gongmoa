// @ts-expect-error Native Node tests use explicit extensions.
import {evidenceHash,readEvidenceBytes} from './namhae-evidence.ts';

export const ripcUrl='https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000126087';
export const ripcAttachment='https://www.bizinfo.go.kr/cmm/fms/fileDown.do?atchFileId=FILE_000000000771753&fileSn=0';
export const ripcAttachmentHash='e971f0582ddda103c0920cc1f3b36b047f30cc151c1cc71d4cc02b29c8157217';
const ripcTitle='[강원] 남부권 2026년 소상공인 IP창출지원 레시피 특허 출원 지원사업 모집 공고';

export function ripcCanonical(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
  const titles=[...clean.matchAll(/<h2 class="title">([\s\S]*?)<\/h2>/g)];
  if(titles.length!==1||titles[0][1].trim()!==ripcTitle)throw Error('RIPC 공고 제목 불일치');
  const fields=new Map<string,string>();
  for(const m of clean.matchAll(/<li\b[^>]*>\s*<span class="s_title">([^<]+)<\/span>([\s\S]*?)<\/li>/g)){
    if(fields.has(m[1])||/<li\b/i.test(m[2]))throw Error('RIPC 상세 필드 중복/경계 오류');
    fields.set(m[1],m[2].replace(/\s+/g,' ').trim());
  }
  for(const k of ['소관부처·지자체','사업수행기관','신청기간','사업개요','사업신청 방법'])if(!fields.get(k))throw Error('RIPC 상세 필수항목 누락');
  const attachments=[...new Set([...clean.matchAll(/href="(\/cmm\/fms\/fileDown\.do\?[^"<>]+)"/g)].map(m=>m[1].replace(/&amp;/g,'&')))].sort();
  if(!attachments.includes(new URL(ripcAttachment).pathname+new URL(ripcAttachment).search))throw Error('RIPC 공고문 첨부 연결 변경');
  return JSON.stringify({title:ripcTitle,fields:[...fields].sort(([a],[b])=>a<b?-1:a>b?1:0),attachments});
}

export async function verifyRipcEvidence(detailHash:string,fetcher:typeof fetch=fetch,attachmentHash=ripcAttachmentHash){
  const signal=AbortSignal.timeout(20000),init={signal,redirect:'manual' as const};
  const detail=await readEvidenceBytes(await fetcher(ripcUrl,init));
  if(await evidenceHash(new TextEncoder().encode(ripcCanonical(new TextDecoder().decode(detail))))!==detailHash)throw Error('RIPC 본문 변경');
  const file=await readEvidenceBytes(await fetcher(ripcAttachment,init));
  const ole=[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1];
  if(!ole.every((x,i)=>file[i]===x)||await evidenceHash(file)!==attachmentHash)throw Error('RIPC 첨부 변경 또는 오류 응답');
}
