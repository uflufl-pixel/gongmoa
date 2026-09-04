// @ts-expect-error Native Node tests use explicit extensions.
import {evidenceHash,readEvidenceBytes} from './namhae-evidence.ts';

export const uctfTourazUrl='https://touraz.kr/announcementList/pssrpView?pssrpSeq=1426';
export const uctfNoticePdf='https://uctf.or.kr/api/files/20260225163611.pdf?name=2026+%EC%9A%B8%EC%82%B0+%EA%B4%80%EA%B4%91+%EC%9D%B8%EC%9E%AC+%EC%9D%B8%ED%84%B4%EC%8B%AD+%EC%A7%80%EC%9B%90%EC%82%AC%EC%97%85+%EB%AA%A8%EC%A7%91+%EA%B3%B5%EA%B3%A0%EB%AC%B8.pdf';
export const uctfNoticePdfHash='84461152d398fe6b79eada218e2ca714d91e879c4513d0e0623e20f0c12a6ddb';
const title='2026 울산 관광 인재 인턴십 지원사업 참여기업 모집';
const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();

export function uctfCanonical(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const titles=[...clean.matchAll(/<h3 class="h3">([\s\S]*?)<\/h3>/g)].map(m=>plain(m[1]));
  if(titles.length!==1||titles[0]!==title)throw Error('울산 관광 인턴십 공고 제목 불일치');
  const ids=[...clean.matchAll(/(?:id|name)=["']pssrpSeq["'][^>]*value=["']([^"']+)/g)].map(m=>m[1]);
  if(ids.length!==1||ids[0]!=='1426')throw Error('울산 관광 인턴십 공고 ID 불일치');
  const field=(label:string)=>{
    const values=[...clean.matchAll(new RegExp(`<dt>${label.replace(/[()]/g,'\\$&')}<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`,'g'))];
    return values.length===1?plain(values[0][1]):null;
  };
  const application=field('신청기간'),target=field('신청대상'),count=field('지원분야(선정수)'),description=field('사업설명'),documents=field('제출서류');
  if(!application||target!=='기업'||count!=='10'||!description?.includes('울산 관광 인재 인턴십 지원사업')||!documents||!plain(clean).includes('재단법인 울산문화관광재단 대표이사'))throw Error('울산 관광 인턴십 상세 필수항목 누락');
  return JSON.stringify({title,id:'1426',application,target,count,description,documents});
}

export async function verifyUctfEvidence(detailHash:string,fetcher:typeof fetch=fetch,pdfHash=uctfNoticePdfHash){
  const signal=AbortSignal.timeout(20000),init={signal,redirect:'manual' as const};
  const detail=await readEvidenceBytes(await fetcher(uctfTourazUrl,init));
  if(await evidenceHash(new TextEncoder().encode(uctfCanonical(new TextDecoder().decode(detail))))!==detailHash)throw Error('울산 관광 인턴십 본문 변경');
  const pdf=await readEvidenceBytes(await fetcher(uctfNoticePdf,init),1_000_000);
  if(new TextDecoder().decode(pdf.slice(0,5))!=='%PDF-'||await evidenceHash(pdf)!==pdfHash)throw Error('울산 관광 인턴십 공고문 변경 또는 오류 응답');
}
