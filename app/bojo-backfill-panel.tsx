'use client';
import {useEffect,useRef,useState} from 'react';
type Progress={year:number;next_page:number;total_rows:number|null;scanned_rows:number;completed:number};
export default function BojoBackfillPanel(){
  const [progress,setProgress]=useState<Progress|null>(null);
  const [running,setRunning]=useState(false),[message,setMessage]=useState('');
  const stop=useRef(false);
  useEffect(()=>{fetch('/api/bojo-backfill').then(r=>r.ok?r.json():null).then(data=>setProgress(data as Progress|null)).catch(()=>{});return()=>{stop.current=true}},[]);
  const run=async()=>{
    stop.current=false;setRunning(true);setMessage('페이지별로 저장합니다. 중단해도 다음 페이지부터 이어집니다.');
    try{
      // Bounded foreground run. A later click resumes the durable checkpoint.
      for(let i=0;i<10&&!stop.current;i++){
        const r=await fetch('/api/bojo-backfill',{method:'POST'});
        const data=await r.json() as {progress:Progress;busy?:boolean;error?:string};
        if(!r.ok)throw new Error(data.error||'수집 실패');
        setProgress(data.progress);
        if(data.progress.completed){setMessage('올해 API 전체 페이지 확인을 완료했습니다. 공모 목록을 새로고침해 주세요.');return;}
        if(data.busy){setMessage('다른 수집이 진행 중입니다. 잠시 후 이어받을 수 있습니다.');return;}
      }
      setMessage('이번 묶음을 저장했습니다. 이어받기를 누르면 계속됩니다.');
    }catch(error){setMessage(`${error instanceof Error?error.message:'수집 실패'} 저장된 진행 위치는 유지됩니다.`)}finally{setRunning(false)}
  };
  return <section className="syncCenter"><h2>국고 공모 누락 보완</h2><p>올해 보조금 API 전체 페이지를 확인합니다. 일반 보조사업과 마감된 공고는 새로 등록하지 않습니다.</p><p role="status">{progress?`${progress.scanned_rows.toLocaleString()} / ${progress.total_rows?.toLocaleString()??'확인 중'}개 원본 행 확인 · ${progress.completed?'전체 페이지 완료':`${progress.next_page}페이지부터 이어받기`}`:'상태 확인 중'}</p><button onClick={run} disabled={running||Boolean(progress?.completed)}>{running?'전체 수집 중…':progress?.completed?'페이지 확인 완료':'전체 수집 시작·이어받기'}</button>{running&&<button onClick={()=>{stop.current=true;setMessage('현재 페이지 저장 후 멈춥니다.')}}>현재 페이지 후 중단</button>}<p role="status">{message}</p><small>원본 행 수는 공모 건수가 아닙니다. 전체 페이지 확인도 포털 화면과의 일치 검증을 의미하지는 않습니다.</small></section>
}
