'use client';

import { useMemo, useState } from 'react';

type Notice = { id:number; org:string; group:string; title:string; due:string; dday:number; tag:string; audience:string; source:string; url:string };
const notices: Notice[] = [
  {id:1,org:'과학기술정보통신부',group:'중앙부처',title:'2026년 GovTech 창업 경진대회 모집 공고',due:'2026.09.21',dday:20,tag:'창업',audience:'기업·예비창업자',source:'기업마당',url:'https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do'},
  {id:2,org:'중소벤처기업부',group:'중앙부처',title:'2026년 2차 온라인수출 중소기업 물류 지원 사업',due:'2026.09.16',dday:15,tag:'수출',audience:'중소기업',source:'기업마당',url:'https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do'},
  {id:3,org:'경상북도',group:'지방자치단체',title:'2026 안동 낙동강 힐링로드 보조사업 지원신청 공모',due:'2026.09.14',dday:13,tag:'지역',audience:'기관·단체',source:'보조금통합포털',url:'https://www.bojo.go.kr/retrieveSearchPubBiz.do'},
  {id:4,org:'중소벤처기업부',group:'중앙부처',title:'민관협력 오픈이노베이션 지원 창업기업 모집',due:'2026.09.09',dday:8,tag:'기술',audience:'창업기업',source:'기업마당',url:'https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do'},
  {id:5,org:'경기도',group:'지방자치단체',title:'H-스타트업 창업경진대회 참가자 모집',due:'2026.09.07',dday:6,tag:'창업',audience:'예비창업자',source:'기업마당',url:'https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do'},
  {id:6,org:'부산광역시',group:'지방자치단체',title:'BOUNCE 2026 글로벌 오피스아워 참여 스타트업 모집',due:'2026.09.04',dday:3,tag:'수출',audience:'스타트업',source:'기업마당',url:'https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do'},
  {id:7,org:'교육부',group:'중앙부처',title:'제2차 학교복합시설 공모사업',due:'공고문 확인',dday:30,tag:'교육',audience:'지방자치단체',source:'교육부',url:'https://www.moe.go.kr/boardCnts/listRenew.do?boardID=72761&m=020502&s=moe'},
  {id:8,org:'한국환경산업기술원',group:'공사·공단',title:'해외 환경프로젝트 타당성조사 지원사업 모집',due:'상시 접수',dday:99,tag:'환경',audience:'기업',source:'보조금통합포털',url:'https://www.bojo.go.kr/'},
];
const groups = ['전체','중앙부처','위원회','공사·공단','지방자치단체'];
const institutions = [
  ['중앙행정기관','19부 · 6처 · 19청','기획재정부, 교육부, 과기정통부, 외교부, 법무부, 국방부, 행정안전부, 문체부, 농식품부, 산업통상부, 보건복지부, 기후에너지환경부, 고용노동부, 성평등가족부, 국토교통부, 해양수산부, 중소벤처기업부 등'],
  ['위원회·독립기관','헌법기관 및 6위원회','국가인권위원회, 국가교육위원회, 방송미디어통신위원회, 금융위원회, 공정거래위원회, 국민권익위원회 등'],
  ['공사·공단','2차 확장 수집군','공공기관 경영정보 공개시스템 기준 기관별 고시·공고·지원사업 게시판'],
  ['지방자치단체','17개 광역 + 226개 기초','시·도 및 시·군·구 고시공고, 보탬e 연계 지방보조사업'],
];

export default function Home() {
  const [query,setQuery]=useState(''); const [group,setGroup]=useState('전체'); const [saved,setSaved]=useState<number[]>([2,7]); const [showSaved,setShowSaved]=useState(false);
  const filtered=useMemo(()=>notices.filter(n=>(group==='전체'||n.group===group)&&(!showSaved||saved.includes(n.id))&&(`${n.org} ${n.title} ${n.tag} ${n.audience}`).toLowerCase().includes(query.toLowerCase())),[query,group,saved,showSaved]);
  const toggle=(id:number)=>setSaved(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  return <main>
    <header className="topbar"><a className="brand" href="#"><span>공</span>모아</a><nav><a href="#notices">공모 찾기</a><a href="#sources">수집 범위</a><button onClick={()=>setShowSaved(v=>!v)} className={showSaved?'active':''}>관심 공모 {saved.length}</button></nav></header>
    <section className="hero"><div className="eyebrow">대한민국 공모사업 통합 탐색</div><h1>흩어진 공모사업,<br/><em>한곳에서 놓치지 않게.</em></h1><p>정부 부처부터 위원회, 공사·공단, 지방자치단체까지 공식 공고를 모아 정리합니다.</p><form className="search" onSubmit={e=>{e.preventDefault();document.querySelector('#notices')?.scrollIntoView()}}><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="공모 검색" placeholder="기관명, 사업명, 지원 분야를 검색하세요"/><button>검색</button></form><div className="quick"><span>빠른 탐색</span>{['창업','수출','교육','환경'].map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>)}</div></section>
    <section className="overview"><div><b>{notices.length}</b><span>MVP 표본 공모</span></div><div><b>64</b><span>1차 수집 대상 기관</span></div><div><b>4</b><span>공식 통합 출처</span></div><div><b>09.01</b><span>표본 확인일</span></div></section>
    <section className="content" id="notices"><div className="sectionhead"><div><span>OPEN CALLS</span><h2>{showSaved?'저장한 공모':'공모사업 둘러보기'}</h2></div><p>{filtered.length}건 표시 · 표본 데이터</p></div><div className="filters" role="group" aria-label="기관 유형 필터">{groups.map(g=><button className={group===g?'selected':''} onClick={()=>setGroup(g)} key={g}>{g}</button>)}</div>
      {filtered.length?<div className="noticegrid">{filtered.map((n,i)=><article key={n.id} className="notice"><div className="meta"><span className={`tag t${i%4}`}>{n.tag}</span><button onClick={()=>toggle(n.id)} aria-label="관심 공모 저장">{saved.includes(n.id)?'★':'☆'}</button></div><p>{n.group} · {n.org}</p><h3><a href={n.url} target="_blank" rel="noreferrer">{n.title}</a></h3><div className="audience">지원대상 · {n.audience}</div><footer><strong>{n.due}</strong><span>{n.dday<90?`D-${n.dday}`:'상시'}</span></footer><a className="source" href={n.url} target="_blank" rel="noreferrer">{n.source} 원문 ↗</a></article>)}</div>:<div className="empty">조건에 맞는 표본 공모가 없습니다. 검색어나 기관 유형을 바꿔보세요.</div>}
    </section>
    <section className="scope" id="sources"><div className="scopeintro"><span>COLLECTION MAP</span><h2>조직도를 수집 지도로 바꿨어요.</h2><p>제공된 2026년 정부 조직도를 1차 기관 체계로 삼고, 공공기관과 지자체를 단계적으로 확장합니다.</p></div><div className="scopegrid">{institutions.map((x,i)=><article key={x[0]}><i>0{i+1}</i><h3>{x[0]}</h3><strong>{x[1]}</strong><p>{x[2]}</p></article>)}</div></section>
    <section className="pipeline"><div><span>매일 자동 수집</span><b>공식 게시판 확인</b></div><i>→</i><div><span>중복·비공모 제거</span><b>AI + 규칙 분류</b></div><i>→</i><div><span>마감일·대상 추출</span><b>검증 대기열</b></div><i>→</i><div><span>변경사항 추적</span><b>알림·게시</b></div></section>
    <section className="sources"><h2>우선 연결할 공식 출처</h2><div><a href="https://www.bojo.go.kr/retrieveSearchPubBiz.do" target="_blank">보조금통합포털 <small>국고·지방 보조 공모</small></a><a href="https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do" target="_blank">기업마당 <small>기업 지원사업</small></a><a href="https://www.gov.kr/portal/orgSite" target="_blank">정부24 기관 누리집 <small>기관 주소 기준정보</small></a><a href="https://www.moe.go.kr/boardCnts/listRenew.do?boardID=72761&m=020502&s=moe" target="_blank">기관별 사업공고 <small>원문 교차검증</small></a></div><p>현재 화면은 제품 구조 검증용 표본입니다. 운영판에서는 출처별 수집 시각, 원문 해시, 변경 이력과 검수 상태를 함께 저장합니다.</p></section>
    <footer className="footer"><a className="brand" href="#"><span>공</span>모아</a><p>공식 원문을 가장 먼저 확인하세요. 공모아는 탐색을 돕는 통합 안내 서비스입니다.</p><a href="mailto:hello@gongmoa.kr">제보·문의</a></footer>
  </main>
}
