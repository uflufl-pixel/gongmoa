// @ts-expect-error Native Node tests use explicit extensions.
import {evidenceHash,readEvidenceBytes} from './namhae-evidence.ts';

export const tourazChongqingUrl='https://touraz.kr/announcementList/pssrpView?pssrpSeq=1711';
export const tourazChongqingNoticeHash='4cebcce756a1aa6ffa4c5ee43bade818b62c382049ad47cf1a969d0bed29b107';
const title="충칭 한국 소비재 판촉전 연계 'K-관광 홍보관' 참가안내";
const noticeName='[청두지사] 충칭 한국 프리미엄 소비재 판촉전 연계 K-관광 홍보관 참가모집안.pdf';

function noticeAttachment(html:string){
  const matches=[...html.matchAll(/<dl>\s*<dt>([^<]+)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>\s*<\/dl>/g)]
    .filter(m=>m[1].replace(/\s+/g,' ').trim()===noticeName);
  if(matches.length!==1)throw Error('충칭 홍보관 첨부 변경');
  const href=matches[0][2].match(/href="(\/comm\/getFile\?[^"<>]+)"/);
  if(!href)throw Error('충칭 홍보관 첨부 변경');
  const url=new URL(href[1].replace(/&amp;/g,'&'),tourazChongqingUrl);
  if(url.searchParams.get('srvcId')!=='CONTEST_FILE'||url.searchParams.get('fileTy')!=='ATTACH')throw Error('충칭 홍보관 첨부 변경');
  return url.href;
}

export function tourazChongqingCanonical(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const titles=[...clean.matchAll(/<h3 class="h3">([\s\S]*?)<\/h3>/g)].map(m=>m[1].replace(/\s+/g,' ').trim());
  if(titles.length!==1||titles[0]!==title)throw Error('충칭 홍보관 제목 불일치');
  const field=(label:string)=>{
    const matches=[...clean.matchAll(new RegExp(`<dt>${label}<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`,'g'))];
    return matches.length===1?matches[0][1].replace(/\s+/g,' ').trim():null;
  };
  const period=field('신청기간'),description=field('사업설명');
  if(!period?.includes('2026-09-08')||!period.includes('09-23')||!period.includes('18시')||!description?.includes('국내 관광기업')||!description.includes('1~3개사'))throw Error('충칭 홍보관 상세 필수항목 누락');
  noticeAttachment(clean);
  return JSON.stringify({title,period,description,noticeName});
}

export async function verifyTourazChongqingEvidence(detailHash:string,fetcher:typeof fetch=fetch,noticeHash=tourazChongqingNoticeHash){
  const init={signal:AbortSignal.timeout(20000),redirect:'manual' as const};
  const detail=await readEvidenceBytes(await fetcher(tourazChongqingUrl,init));
  const html=new TextDecoder().decode(detail);
  if(await evidenceHash(new TextEncoder().encode(tourazChongqingCanonical(html)))!==detailHash)throw Error('충칭 홍보관 본문 변경');
  const file=await readEvidenceBytes(await fetcher(noticeAttachment(html),init),8_000_000);
  if(new TextDecoder().decode(file.slice(0,5))!=='%PDF-'||await evidenceHash(file)!==noticeHash)throw Error('충칭 홍보관 공고문 변경');
}
