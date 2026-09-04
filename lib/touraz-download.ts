// Official public CSV download. Preview only: no database writes or verified grants.
export const tourazDownloadUrl='https://touraz.kr/fnct/ps/announcementList/getCsvPssrpList?tabMode=ktoip';
export const tourazSource={id:'touraz-kto',institutionId:'public-183',name:'한국관광공사 투어라즈 공개 CSV',url:'https://touraz.kr/announcementList'};
const headers=['상태','기관명','제목','신청기간','담당부서','등록일','링크'];
const maxBytes=2_000_000;

export function parseCsvRows(input:string):string[][]{
  if(new TextEncoder().encode(input).length>maxBytes)throw Error('CSV 크기 제한 초과');
  const text=input.replace(/^\uFEFF/,'');
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
  const field=()=>{row.push(cell);cell='';closed=false;if(row.length>7)throw Error('CSV 열 수 변경');};
  const record=()=>{field();if(row.length!==1||row[0]!=='')rows.push(row);row=[];if(rows.length>10001)throw Error('CSV 행 수 제한 초과');};
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
    else if(c===',')field();
    else if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;record();}
    else if(c==='"'&&!cell&&!closed)quoted=true;
    else {if(closed||c==='"')throw Error('CSV 따옴표 구조 오류');cell+=c;}
    if(cell.length>10000)throw Error('CSV 셀 길이 제한 초과');
  }
  if(quoted)throw Error('CSV 따옴표 미종료');
  if(cell||row.length||closed)record();
  return rows;
}
function date(s:string){const d=new Date(s+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
function identity(link:string){
  if(!/^https:\/\/touraz\.kr\/announcementList\/pssrpView\?pssrpSeq=[1-9]\d{0,15}$/.test(link))return null;
  return new URL(link).searchParams.get('pssrpSeq');
}
export function tourazCandidate(title:string){
  if(/이벤트|위원|임원|기관장|직위|채용|입찰|개찰|용역|합격|결과|선정\s*공고|수상작|수상자|일자리페스타|설명회|설문|수요\s*조사|강사|매니저|서포터즈|발표\s*(평가|심사)|서류\s*평가|심의\s*참여/.test(title))return false;
  // Employer support is a potential grant; recruiting individual interns is not.
  if(/인턴/.test(title)&&!(/인턴십\s*지원사업/.test(title)&&/참여\s*기업\s*(모집|공모)/.test(title)))return false;
  return /공모|모집|지원사업|경진대회/.test(title);
}
export function tourazReception(sourceState:string,from:string,to:string,now=new Date()):'open'|'upcoming'|'closed'|'unknown'{
  if(!Number.isFinite(now.getTime())||!date(from)||!date(to)||from>to)return 'unknown';
  const today=new Date(now.getTime()+9*60*60*1000).toISOString().slice(0,10);
  if(sourceState==='종료'||to<today)return 'closed';
  if(from>today)return 'upcoming';
  if(to===today||sourceState!=='접수')return 'unknown';
  return 'open';
}
export function previewTourazCsv(input:string,now=new Date()){
  const rows=parseCsvRows(input);
  if(!rows.length||JSON.stringify(rows.shift())!==JSON.stringify(headers))throw Error('투어라즈 CSV 필수 열 변경 또는 빈 파일');
  if(!rows.length)throw Error('투어라즈 CSV 데이터 없음');
  const seen=new Map<string,string>();
  const institutions:Record<string,number>=Object.create(null),states:Record<string,number>=Object.create(null);
  let duplicates=0;
  const rejected:Array<{row:number;reason:string}>=[];
  const items=rows.flatMap((raw,index)=>{
    if(raw.length!==7){rejected.push({row:index+2,reason:'열 수 오류'});return [];}
    const [sourceState,institution,title,period,department,posted,sourceUrl]=raw.map(s=>s.trim());
    const externalId=identity(sourceUrl),range=/^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/.exec(period);
    if(!externalId||!institution||!title||!date(posted)||!['접수','대기','종료'].includes(sourceState)||!range||!date(range[1])||!date(range[2])||range[1]>range[2]){
      rejected.push({row:index+2,reason:'식별자·필수값·상태·날짜 확인 필요'});return [];
    }
    const signature=JSON.stringify([sourceState,institution,title,range[1],range[2],department,posted,sourceUrl]);
    if(seen.has(externalId)){if(seen.get(externalId)!==signature)throw Error('동일 공고 ID의 상충 데이터');duplicates++;return [];}
    seen.set(externalId,signature);
    institutions[institution]=(institutions[institution]||0)+1;states[sourceState]=(states[sourceState]||0)+1;
    return [{externalId,institution,title,sourceState,receptionState:tourazReception(sourceState,range[1],range[2],now),department,posted,sourceUrl,applicationFrom:range[1],applicationTo:range[2],deadlinePrecision:'date' as const,opensAt:null,closesAt:null,candidate:tourazCandidate(title),verification:'candidate' as const}];
  });
  return {previewOnly:true,stored:0,verified:0,parsedRows:rows.length,validRows:items.length,duplicates,rejected,institutions,states,latestPosted:items.map(i=>i.posted).sort().at(-1)||null,candidateRows:items.filter(i=>i.candidate).length,items};
}
export async function fetchTourazCsv(fetcher:typeof fetch=fetch){
  const response=await fetcher(tourazDownloadUrl,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{accept:'text/csv','content-type':'application/x-www-form-urlencoded;charset=UTF-8','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'},body:new URLSearchParams({fileName:'투어라즈 공모 목록 공공데이터 개방',title:'투어라즈 공모 목록',isComsubmit:'1'})});
  if(!response.ok||!/^text\/csv(?:;|$)/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw Error('공식 CSV 응답 확인 필요');}
  const reader=response.body?.getReader();if(!reader)throw Error('빈 CSV 응답');
  const decoder=new TextDecoder('utf-8',{fatal:true});let bytes=0,text='';
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();throw Error('CSV 크기 제한 초과');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
  if(!bytes)throw Error('빈 CSV 응답');
  return text;
}
export function collectTourazKto(input:string,knownIds:readonly string[]=[],now=new Date()){
  const preview=previewTourazCsv(input,now);
  if(preview.rejected.length)throw Error('투어라즈 CSV 오류 행 확인 필요');
  const known=new Set(knownIds);
  const items=preview.items.filter(i=>i.institution==='한국관광공사'&&(known.has(i.externalId)||(i.candidate&&i.receptionState!=='closed'))).map(i=>({
    sourceId:tourazSource.id,externalId:i.externalId,institution:i.institution,group:'공사·공단',title:i.title,category:'문화·관광',audience:'원문 지원자격 확인',region:null,sourceName:tourazSource.name,sourceUrl:i.sourceUrl,ministry:'문화체육관광부',announcedFrom:i.posted,applicationFrom:i.applicationFrom,applicationTo:i.applicationTo,opensAt:null,closesAt:null,deadlineLabel:`${i.applicationFrom} ~ ${i.applicationTo} · 마감시각 원문 확인`,status:i.sourceState==='종료'?'closed':i.sourceState==='대기'?'pending':'open',
  }));
  return {items,parsedRows:preview.parsedRows};
}
export async function handleTourazPreview(request:Request,fetcher:typeof fetch=fetch){
  if(request.method!=='POST'||new URL(request.url).search)return Response.json({error:'POST without parameters required'},{status:400});
  try{return Response.json({...previewTourazCsv(await fetchTourazCsv(fetcher)),checkedAt:new Date().toISOString()},{headers:{'cache-control':'no-store'}});}
  catch(error){return Response.json({previewOnly:true,stored:0,error:error instanceof Error?error.message:'다운로드 확인 필요'},{status:502,headers:{'cache-control':'no-store'}});}
}
