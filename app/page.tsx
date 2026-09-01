'use client';

import { useEffect, useMemo, useState } from 'react';

type Notice = { id:string; org:string; group:string; title:string; due:string; dday:number; tag:string; audience:string; source:string; url:string };
type SourceCheck = { id:string; sourceId:string; outcome:string; statusCode:number|null; contentBytes:number|null; keywordHits:number|null; pageTitle:string|null; message:string|null; finishedAt:string };
const fallback: Notice[] = [
  {id:'govtech-2026',org:'과학기술정보통신부',group:'중앙부처',title:'2026년 GovTech 창업 경진대회 모집 공고',due:'2026.09.21',dday:20,tag:'창업',audience:'기업·예비창업자',source:'기업마당',url:'https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do'},
  {id:'export-logistics-2026',org:'중소벤처기업부',group:'중앙부처',title:'2026년 2차 온라인수출 중소기업 물류 지원 사업',due:'2026.09.16',dday:15,tag:'수출',audience:'중소기업',source:'기업마당',url:'https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do'},
  {id:'andong-healingroad-2026',org:'경상북도',group:'지방자치단체',title:'2026 안동 낙동강 힐링로드 보조사업 지원신청 공모',due:'2026.09.14',dday:13,tag:'지역',audience:'기관·단체',source:'보조금통합포털',url:'https://www.bojo.go.kr/retrieveSearchPubBiz.do'},
  {id:'open-innovation-2026',org:'중소벤처기업부',group:'중앙부처',title:'민관협력 오픈이노베이션 지원 창업기업 모집',due:'2026.09.09',dday:8,tag:'기술',audience:'창업기업',source:'기업마당',url:'https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do'},
  {id:'school-complex-2026',org:'교육부',group:'중앙부처',title:'2026년 제2차 학교복합시설 공모사업',due:'공고문 확인',dday:99,tag:'교육',audience:'지방자치단체',source:'교육부',url:'https://www.moe.go.kr/boardCnts/listRenew.do?boardID=72761&m=020502&s=moe'},
];
const groups = ['전체','중앙부처','위원회','공사·공단','지방자치단체'];
const institutions = [
  ['중앙행정기관','19부 · 6처 · 19청','기획재정부, 교육부, 과기정통부, 외교부, 법무부, 국방부, 행정안전부, 문체부, 농식품부, 산업통상부, 보건복지부, 기후에너지환경부, 고용노동부, 성평등가족부, 국토교통부, 해양수산부, 중소벤처기업부 등'],
  ['위원회·독립기관','헌법기관 및 6위원회','국가인권위원회, 국가교육위원회, 방송미디어통신위원회, 금융위원회, 공정거래위원회, 국민권익위원회 등'],
  ['공사·공단','2차 확장 수집군','공공기관 경영정보 공개시스템 기준 기관별 고시·공고·지원사업 게시판'],
  ['지방자치단체','17개 광역 + 226개 기초','시·도 및 시·군·구 고시공고, 보탬e 연계 지방보조사업'],
];

function daysUntil(value:string|null) {
  if(!value) return 99;
  return Math.max(0,Math.ceil((new Date(value).getTime()-Date.now())/86400000));
}

export default function Home() {
  const [notices,setNotices]=useState<Notice[]>(fallback); const [query,setQuery]=useState(''); const [group,setGroup]=useState('전체');
  const [saved,setSaved]=useState<string[]>([]); const [showSaved,setShowSaved]=useState(false); const [mode,setMode]=useState<'connecting'|'live-db'|'fallback'>('connecting'); const [deviceKey,setDeviceKey]=useState('');
  const [checks,setChecks]=useState<SourceCheck[]>([]); const [syncing,setSyncing]=useState(false);
  useEffect(()=>{
    const key=localStorage.getItem('gongmoa-device')||crypto.randomUUID().replaceAll('-',''); localStorage.setItem('gongmoa-device',key); setDeviceKey(key);
    fetch('/api/notices').then(r=>r.ok?r.json():Promise.reject()).then(data=>{
      setNotices(data.items.map((n:{id:string;institution:string;group:string;title:string;deadlineLabel:string;closesAt:string|null;category:string;audience:string;sourceName:string;sourceUrl:string})=>({id:n.id,org:n.institution,group:n.group,title:n.title,due:n.deadlineLabel,dday:daysUntil(n.closesAt),tag:n.category,audience:n.audience,source:n.sourceName,url:n.sourceUrl})));
      setMode('live-db');
    }).catch(()=>setMode('fallback'));
    fetch(`/api/bookmarks?deviceKey=${key}`).then(r=>r.ok?r.json():Promise.reject()).then(data=>setSaved(data.items.map((x:{noticeId:string})=>x.noticeId))).catch(()=>{});
    fetch('/api/sync').then(r=>r.ok?r.json():Promise.reject()).then(data=>setChecks(data.items)).catch(()=>{});
  },[]);
  const filtered=useMemo(()=>notices.filter(n=>(group==='전체'||n.group===group)&&(!showSaved||saved.includes(n.id))&&(`${n.org} ${n.title} ${n.tag} ${n.audience}`).toLowerCase().includes(query.toLowerCase())),[notices,query,group,saved,showSaved]);
  const toggle=(id:string)=>{const next=!saved.includes(id);setSaved(s=>next?[...s,id]:s.filter(x=>x!==id));if(deviceKey)fetch('/api/bookmarks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({deviceKey,noticeId:id,saved:next})}).catch(()=>{});};
  const runSync=async()=>{setSyncing(true);try{const response=await fetch('/api/sync',{method:'POST'});if(!response.ok)throw new Error();const data=await response.json();setChecks(data.results);}finally{setSyncing(false)}};
  return <main>
    <header className="topbar"><a className="brand" href="#"><span>공</span>모아</a><nav><a href="#notices">공모 찾기</a><a href="#sources">수집 범위</a><button onClick={()=>setShowSaved(v=>!v)} className={showSaved?'active':''}>관심 공모 {saved.length}</button></nav></header>
    <section className="hero"><div className="eyebrow">대한민국 공모사업 통합 탐색</div><h1>흩어진 공모사업,<br/><em>한곳에서 놓치지 않게.</em></h1><p>정부 부처부터 위원회, 공사·공단, 지방자치단체까지 공식 공고를 모아 정리합니다.</p><form className="search" onSubmit={e=>{e.preventDefault();document.querySelector('#notices')?.scrollIntoView()}}><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="공모 검색" placeholder="기관명, 사업명, 지원 분야를 검색하세요"/><button>검색</button></form><div className="quick"><span>빠른 탐색</span>{['창업','수출','교육','환경'].map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>)}</div></section>
    <section className="overview"><div><b>{notices.length}</b><span>저장된 공모</span></div><div><b>64</b><span>1차 수집 대상 기관</span></div><div><b>4</b><span>연결된 공식 출처</span></div><div><b className={mode==='live-db'?'live':'pending'}>{mode==='live-db'?'LIVE':mode==='fallback'?'표본':'연결 중'}</b><span>데이터 저장소</span></div></section>
    <section className="content" id="notices"><div className="sectionhead"><div><span>OPEN CALLS</span><h2>{showSaved?'저장한 공모':'공모사업 둘러보기'}</h2></div><p>{filtered.length}건 표시 · {mode==='live-db'?'영구 저장소 동기화':'검증 표본'}</p></div><div className="filters" role="group" aria-label="기관 유형 필터">{groups.map(g=><button className={group===g?'selected':''} onClick={()=>setGroup(g)} key={g}>{g}</button>)}</div>
      {filtered.length?<div className="noticegrid">{filtered.map((n,i)=><article key={n.id} className="notice"><div className="meta"><span className={`tag t${i%4}`}>{n.tag}</span><button onClick={()=>toggle(n.id)} aria-label="관심 공모 저장">{saved.includes(n.id)?'★':'☆'}</button></div><p>{n.group} · {n.org}</p><h3><a href={n.url} target="_blank" rel="noreferrer">{n.title}</a></h3><div className="audience">지원대상 · {n.audience}</div><footer><strong>{n.due}</strong><span>{n.dday<90?`D-${n.dday}`:'확인 필요'}</span></footer><a className="source" href={n.url} target="_blank" rel="noreferrer">{n.source} 원문 ↗</a></article>)}</div>:<div className="empty">조건에 맞는 공모가 없습니다. 검색어나 기관 유형을 바꿔보세요.</div>}
    </section>
    <section className="scope" id="sources"><div className="scopeintro"><span>COLLECTION MAP</span><h2>조직도를 수집 지도로 바꿨어요.</h2><p>제공된 2026년 정부 조직도를 1차 기관 체계로 삼고, 공공기관과 지자체를 단계적으로 확장합니다.</p></div><div className="scopegrid">{institutions.map((x,i)=><article key={x[0]}><i>0{i+1}</i><h3>{x[0]}</h3><strong>{x[1]}</strong><p>{x[2]}</p></article>)}</div></section>
    <section className="pipeline"><div><span>공식 출처 레지스트리</span><b>수집 상태 기록</b></div><i>→</i><div><span>원문 해시 비교</span><b>중복·변경 감지</b></div><i>→</i><div><span>마감일·대상 정규화</span><b>검증 대기열</b></div><i>→</i><div><span>기기별 영구 저장</span><b>관심 공모 동기화</b></div></section>
    <section className="syncCenter"><div className="syncHead"><div><span>SOURCE MONITOR</span><h2>공식 출처 수집 상태</h2><p>원문 접근 여부와 콘텐츠 해시를 저장해 변경을 감지합니다.</p></div><button onClick={runSync} disabled={syncing}>{syncing?'확인 중…':'지금 출처 확인'}</button></div><div className="syncGrid">{checks.length?checks.slice(0,4).map(check=><article key={check.id}><div><i className={check.outcome==='success'?'ok':'warn'}></i><strong>{check.pageTitle||check.sourceId}</strong></div><p>{check.outcome==='success'?`정상 · 키워드 ${check.keywordHits??0}회 · ${Math.round((check.contentBytes||0)/1024).toLocaleString()}KB`:check.message||'확인 필요'}</p><time>{new Date(check.finishedAt).toLocaleString('ko-KR')}</time></article>):<div className="syncEmpty">아직 실행 이력이 없습니다. 출처 확인을 실행하면 상태와 변경 기준 해시가 저장됩니다.</div>}</div><small>기업마당·보조금통합포털의 정식 데이터 API는 별도 인증키 발급 후 목록 수집 모드로 전환됩니다.</small></section>
    <section className="sources"><h2>연결된 공식 출처</h2><div><a href="https://www.bojo.go.kr/retrieveSearchPubBiz.do" target="_blank">보조금통합포털 <small>60분 주기 대상</small></a><a href="https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do" target="_blank">기업마당 <small>60분 주기 대상</small></a><a href="https://www.gov.kr/portal/orgSite" target="_blank">정부24 기관 누리집 <small>기관 기준정보</small></a><a href="https://www.moe.go.kr/boardCnts/listRenew.do?boardID=72761&m=020502&s=moe" target="_blank">교육부 사업공고 <small>원문 교차검증</small></a></div><p>공고·출처·기관·변경이력·관심 공모를 영구 저장하는 운영 데이터 구조가 연결되었습니다. 다음 수집 확장은 기관별 이용정책 확인 후 API 또는 허용된 게시판 수집기로 추가합니다.</p></section>
    <footer className="footer"><a className="brand" href="#"><span>공</span>모아</a><p>공식 원문을 가장 먼저 확인하세요. 공모아는 탐색을 돕는 통합 안내 서비스입니다.</p><a href="mailto:hello@gongmoa.kr">제보·문의</a></footer>
  </main>
}
