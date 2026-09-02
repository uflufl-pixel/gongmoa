// @ts-ignore Explicit extension also supports the native Node test runner.
import {applicationPeriod} from './application-period.ts';

function plain(s:string){return s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim();}
function shortDate(s:string){const m=/^(\d{2})\.(\d{2})\.(\d{2})$/.exec(s);return m?`20${m[1]}-${m[2]}-${m[3]}`:null;}
export function parseKoccaDetail(html:string){
  const title=plain(html.match(/<div class="board_title">([\s\S]*?)<\/div>/)?.[1]||'');
  const fields=new Map([...html.matchAll(/<li><strong>([^<]+)<\/strong><span>([\s\S]*?)<\/span>/g)].map(m=>[plain(m[1]),plain(m[2])]));
  const sections=new Map([...html.matchAll(/<h4>([^<]+)<\/h4>\s*<td>([\s\S]*?)<\/td>/g)].map(m=>[plain(m[1]),m[2]]));
  const method=sections.get('신청방법');
  if(!title||!method||!fields.has('접수시작일')||!fields.has('접수마감일'))throw new Error('콘텐츠진흥원 상세 구조 변경 또는 필수 항목 누락');
  const periodLines=method.split(/<br\s*\/?>/i).map(plain).filter(s=>/(신청|접수)기간\s*[:：]/.test(s));
  if(periodLines.length!==1)throw new Error('콘텐츠진흥원 본문 접수기간 확인 필요');
  const period=periodLines[0];
  const from=shortDate(fields.get('접수시작일')!),to=shortDate(fields.get('접수마감일')!);
  if(!from||!to||!applicationPeriod(`${from} ~ ${to}`))throw new Error('콘텐츠진흥원 접수기간 날짜 오류');
  const conditional=/(상시|소진|모집\s*완료)/.test(period);
  let closesTime='';
  if(!conditional){
    // Only the labeled application line; never event dates or contact hours.
    const m=/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.(?:\([가-힣]+\))?\s*~\s*(?:(\d{4})\.\s*)?(\d{1,2})\.\s*(\d{1,2})\.(?:\([가-힣]+\))?\s*,?\s*(?:(오전|오후)\s*)?(?:(\d{1,2}):(\d{2}))?/.exec(period);
    if(!m)throw new Error('콘텐츠진흥원 본문 기간 형식 확인 필요');
    const date=(y:string,mo:string,d:string)=>`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
    if(date(m[1],m[2],m[3])!==from||date(m[4]||m[1],m[5],m[6])!==to)throw new Error('콘텐츠진흥원 요약·본문 접수기간 불일치');
    if(m[8]){let h=Number(m[8]);if(m[7]==='오후'&&h<12)h+=12;if(m[7]==='오전'&&h===12)h=0;closesTime=` ${String(h).padStart(2,'0')}:${m[9]}`;}
    else if(/\d{1,2}:\d{2}|\d+\s*시/.test(period))throw new Error('콘텐츠진흥원 마감 시각 확인 필요');
  }
  const range=conditional?null:applicationPeriod(`${from} ~ ${to}${closesTime}`);
  if(!conditional&&!range)throw new Error('콘텐츠진흥원 접수 시각 오류');
  return {title,applicationFrom:range?.applicationFrom||null,applicationTo:range?.applicationTo||null,
    opensAt:range?.opensAt.toISOString()||null,closesAt:range?.closesAt.toISOString()||null,
    applicationPeriod:period.slice(0,500),deadlineLabel:range?`${from} ~ ${to}${closesTime}`:period.slice(0,500),
    applicationMethod:plain(method).slice(0,1800),audience:plain(sections.get('지원대상 및 신청자격')||sections.get('신청자격')||'').slice(0,500)||null};
}
export type KoccaDetail=ReturnType<typeof parseKoccaDetail>;
export function mergeKoccaDetail<T extends {audience:string;status:string}>(n:T,d:KoccaDetail,checkedAt:number,now=Date.now()){
  return {...n,...d,audience:d.audience||n.audience,opensAt:d.opensAt?new Date(d.opensAt):null,closesAt:d.closesAt?new Date(d.closesAt):null,
    status:d.closesAt?(Date.parse(d.closesAt)<now?'closed':'open'):n.status,detailVerifiedAt:new Date(checkedAt).toISOString()};
}
