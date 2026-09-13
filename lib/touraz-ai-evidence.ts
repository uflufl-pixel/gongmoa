// @ts-expect-error Native Node tests use explicit extensions.
import {evidenceHash,readEvidenceBytes} from './namhae-evidence.ts';

export const tourazAiUrl='https://touraz.kr/announcementList/pssrpView?pssrpSeq=1710';
export const tourazAiNoticeHash='5d2be4d6d1b5e11fe1b7494ce75ac4e48789d2a93fc4dd5261060eb302c883fb';
const title='AI 기반 지역관광 문제해결 프로젝트(역사문화형) - AI 배리어프리';
const noticeName='★ (공고문 및 가이드라인) AI 기반 지역관광 문제해결 프로젝트(역사문화형) 「AI 배리어프리 부문」.pdf';

function noticeAttachment(html:string){
  const files=[...html.matchAll(/<dl>\s*<dt>([^<]+)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>\s*<\/dl>/g)];
  const matches=files.filter(m=>m[1].replace(/\s+/g,' ').trim()===noticeName);
  if(matches.length!==1)throw Error('AI 배리어프리 공고문 첨부 변경');
  const href=matches[0][2].match(/href="(\/comm\/getFile\?[^"<>]+)"/);
  if(!href)throw Error('AI 배리어프리 공고문 첨부 변경');
  const url=new URL(href[1].replace(/&amp;/g,'&'),tourazAiUrl);
  if(url.searchParams.get('srvcId')!=='CONTEST_FILE'||url.searchParams.get('fileTy')!=='ATTACH')throw Error('AI 배리어프리 공고문 첨부 변경');
  return url.href;
}

export function tourazAiCanonical(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const titles=[...clean.matchAll(/<h3 class="h3">([\s\S]*?)<\/h3>/g)].map(m=>m[1].replace(/\s+/g,' ').trim());
  if(titles.length!==1||titles[0]!==title)throw Error('AI 배리어프리 제목 불일치');
  const field=(label:string)=>{
    const matches=[...clean.matchAll(new RegExp(`<dt>${label}<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`,'g'))];
    return matches.length===1?matches[0][1].replace(/\s+/g,' ').trim():null;
  };
  const period=field('신청기간'),description=field('사업설명');
  if(!period?.includes('2026-09-07')||!period.includes('09-16')||!period.includes('11시')||!description?.includes('혁신기술을 보유한 기업')||!description.includes('온오프믹스'))throw Error('AI 배리어프리 상세 필수항목 누락');
  noticeAttachment(clean);
  return JSON.stringify({title,period,description,noticeName});
}

export async function verifyTourazAiEvidence(detailHash:string,fetcher:typeof fetch=fetch,noticeHash=tourazAiNoticeHash){
  const init={signal:AbortSignal.timeout(20000),redirect:'manual' as const};
  const detail=await readEvidenceBytes(await fetcher(tourazAiUrl,init));
  const html=new TextDecoder().decode(detail);
  if(await evidenceHash(new TextEncoder().encode(tourazAiCanonical(html)))!==detailHash)throw Error('AI 배리어프리 본문 변경');
  const file=await readEvidenceBytes(await fetcher(noticeAttachment(html),init),8_000_000);
  if(new TextDecoder().decode(file.slice(0,5))!=='%PDF-'||await evidenceHash(file)!==noticeHash)throw Error('AI 배리어프리 공고문 변경');
}
