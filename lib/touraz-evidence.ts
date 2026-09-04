// @ts-expect-error Native Node tests use explicit extensions.
import {evidenceHash,readEvidenceBytes} from './namhae-evidence.ts';

export const tourazUrl='https://touraz.kr/announcementList/pssrpView?pssrpSeq=1709';
export const tourazGuideHash='f24913d431b3394709e071a6c40f0718526d28678e4f997cec30c9e20361ecf6';
const tourazTitle='2027 무장애 관광환경 조성 사업 공모 실시';
const guideName='★붙임1. 2027 무장애 관광환경 조성 사업 공모안내서.pdf';

function attachments(clean:string){
  return [...clean.matchAll(/<dl>\s*<dt>([^<]+)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>\s*<\/dl>/g)].flatMap(m=>{
    const href=m[2].match(/href="(\/comm\/getFile\?[^"<>]+)"/);
    return href?[{name:m[1].replace(/\s+/g,' ').trim(),path:href[1].replace(/&amp;/g,'&')}]:[];
  });
}

export function tourazCanonical(html:string){
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const titles=[...clean.matchAll(/<h3 class="h3">([\s\S]*?)<\/h3>/g)].map(m=>m[1].replace(/\s+/g,' ').trim());
  if(titles.length!==1||titles[0]!==tourazTitle)throw Error('투어라즈 공고 제목 불일치');
  const field=(label:string)=>{
    const values=[...clean.matchAll(new RegExp(`<dt>${label}<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`,'g'))];
    if(values.length!==1)return null;
    return values[0][1].replace(/\s+/g,' ').trim();
  };
  const application=field('신청기간'),description=field('사업설명');
  if(!application||!description||!description.includes('광역 및 기초자치단체')||!description.includes('두 가지 모두 필요'))throw Error('투어라즈 상세 필수항목 누락');
  const files=attachments(clean);
  const guide=files.find(file=>file.name===guideName);
  if(!guide||new URL(guide.path,tourazUrl).searchParams.get('srvcId')!=='CONTEST_FILE'||new URL(guide.path,tourazUrl).searchParams.get('fileTy')!=='ATTACH')throw Error('투어라즈 안내서 첨부 연결 변경');
  return JSON.stringify({title:tourazTitle,application,description,files:files.map(file=>file.name).sort()});
}

export async function verifyTourazEvidence(detailHash:string,fetcher:typeof fetch=fetch,guideHash=tourazGuideHash){
  const signal=AbortSignal.timeout(20000),init={signal,redirect:'manual' as const};
  const detail=await readEvidenceBytes(await fetcher(tourazUrl,init));
  const html=new TextDecoder().decode(detail);
  if(await evidenceHash(new TextEncoder().encode(tourazCanonical(html)))!==detailHash)throw Error('투어라즈 본문 변경');
  const guide=attachments(html).find(file=>file.name===guideName);
  if(!guide)throw Error('투어라즈 안내서 첨부 연결 변경');
  const file=await readEvidenceBytes(await fetcher(new URL(guide.path,tourazUrl).href,init),8_000_000);
  if(new TextDecoder().decode(file.slice(0,5))!=='%PDF-'||await evidenceHash(file)!==guideHash)throw Error('투어라즈 안내서 변경 또는 오류 응답');
}
