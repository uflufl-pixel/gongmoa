export function portalDetailRow(payload:unknown,id:string){
  const v=(payload as {taskReqstVo?:Record<string,unknown>})?.taskReqstVo;
  if(!/^[0-9]{21}[AB]$/.test(id)||!v||v.pssrpNo!==id||String(v.bsnsSe)!=='1')throw new Error('국고 공모 원문 식별자 불일치');
  const text=(key:string)=>typeof v[key]==='string'?v[key] as string:typeof v[key]==='number'?String(v[key]):'';
  if(!text('pblancNm')||!text('pssrpInsttNm'))throw new Error('국고 공모 원문 필수 항목 누락');
  // Official IA005100.js defines 0=today deadline, 1=accepting; 2=closed.
  if(!['0','1'].includes(text('pssrpSttus')))return null;
  return {PBLANC_NM:text('pblancNm'),DLVPL_NM:text('pssrpInsttNm'),BSNSYEAR:text('bsnsyear'),
    PBLANC_BEGIN_DE:text('pblancBeginDe'),PBLANC_END_DE:text('pblancEndDe'),
    RCEPT_BEGIN_DE:text('rceptBeginDe'),RCEPT_END_DE:text('rceptEndDe'),
    SPORT_BGAMT:text('sportBgamt'),SPORT_TRGET_CN:text('sportTrgetCn'),REQST_RCEPT_MTH_CN:text('reqstRceptMthCn'),
    PBLANC_POPUP_URL:'https://www.bojo.go.kr/bojo.do?popShareUrl=/ia/getIA005100Popup.do?&nttId='+id+'&pid=POPUP&title=%EA%B3%B5%EB%AA%A8%EC%A0%95%EB%B3%B4'};
}

export function validReconcileIds(value:unknown):value is string[]{return Array.isArray(value)&&value.length>0&&value.length<=5&&value.every(id=>typeof id==='string'&&/^[0-9]{21}[AB]$/.test(id));}
