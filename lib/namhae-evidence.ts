export const namhaeUrl='https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000126034';
export const namhaeAttachment='https://www.bizinfo.go.kr/cmm/fms/fileDown.do?atchFileId=FILE_000000000771537&fileSn=0';
export const namhaeAttachmentHash='b88d4f0b46457cf342d23eef385b76e65f05d590e6974d43b28efaf74168bd91';
export async function evidenceHash(bytes:Uint8Array){
  const hash=await crypto.subtle.digest('SHA-256',bytes as BufferSource);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function namhaeCanonical(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
  const titles=[...clean.matchAll(/<h2 class="title">([\s\S]*?)<\/h2>/g)];
  if(titles.length!==1||titles[0][1].trim()!=='2026년 남해군 면 지역 마을가게 창업 지원사업 참여자 모집 공고')throw Error('남해 공고 제목 불일치');
  const fields=new Map<string,string>();
  for(const m of clean.matchAll(/<li\b[^>]*>\s*<span class="s_title">([^<]+)<\/span>([\s\S]*?)<\/li>/g)){
    if(fields.has(m[1])||/<li\b/i.test(m[2]))throw Error('남해 상세 필드 중복/경계 오류');
    fields.set(m[1],m[2].replace(/\s+/g,' ').trim());
  }
  for(const k of ['소관부처·지자체','사업수행기관','신청기간','사업개요','사업신청 방법'])if(!fields.get(k))throw Error('남해 상세 필수항목 누락');
  const attachments=[...new Set([...clean.matchAll(/href="(\/cmm\/fms\/fileDown\.do\?[^"<>]+)"/g)].map(m=>m[1].replace(/&amp;/g,'&')))].sort();
  if(!attachments.includes(new URL(namhaeAttachment).pathname+new URL(namhaeAttachment).search))throw Error('남해 공고문 첨부 연결 변경');
  return JSON.stringify({title:titles[0][1].trim(),fields:[...fields].sort(([a],[b])=>a.localeCompare(b)),attachments});
}
export async function readEvidenceBytes(response:Response,limit=2_000_000){
  if(!response.ok||!response.body)throw Error('근거 HTTP 응답 오류');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('근거 크기 제한 초과');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return bytes;
}
export async function verifyNamhaeEvidence(detailHash:string,fetcher:typeof fetch=fetch,attachmentHash=namhaeAttachmentHash){
  const signal=AbortSignal.timeout(20000);
  const init={signal,redirect:'manual' as const};
  const detail=await readEvidenceBytes(await fetcher(namhaeUrl,init));
  if(await evidenceHash(new TextEncoder().encode(namhaeCanonical(new TextDecoder().decode(detail))))!==detailHash)throw Error('남해 본문 변경');
  const file=await readEvidenceBytes(await fetcher(namhaeAttachment,init));
  if(file[0]!==0x50||file[1]!==0x4b||await evidenceHash(file)!==attachmentHash)throw Error('남해 첨부 변경 또는 오류 응답');
}
