'use client';

import { useEffect, useMemo, useState } from 'react';
import DataQualityPanel from './data-quality-panel';
import {latestSourceChecks,isStaleCheck} from '../lib/data-quality';
import NoticeFacts from "./notice-facts";
import AdvancedSearch from "./advanced-search";
import {advancedSearch,defaultFilters,type SearchRecord} from "../lib/notice-search";
import BojoBackfillPanel from './bojo-backfill-panel';
import CentralInstitutions from './central-institutions';
import centralRegistry from '../data/central-institutions.json';

type Notice = { details?:SearchRecord; id:string; org:string; group:string; region:string|null; title:string; due:string; dday:number; tag:string; audience:string; source:string; url:string; reviewReason:string|null; relatedCount:number; relatedSources:string[] };
type SourceCheck = { id:string; sourceId:string; outcome:string; statusCode:number|null; contentBytes:number|null; keywordHits:number|null; pageTitle:string|null; message:string|null; finishedAt:string };
type CollectionSummary = { discovered:number; inserted:number; updated:number; unchanged:number; review:number; closed:number };
const groups = ['전체','중앙부처','위원회','공사·공단','지방자치단체'];
const institutions = [
  ['중앙행정기관',['부','처','청'].map(t=>`${centralRegistry.items.filter(x=>x.type===t&&x.scope==='중앙행정기관').length}${t}`).join(' · '),'공식 부·처·청 명단과 별도 2처를 기관 목록에 반영했습니다. 아래 기관 목록에서 등록 여부와 직접 수집 연결 상태를 구분해 확인하세요.'],
  ['위원회·독립기관','헌법기관 및 6위원회','국가인권위원회, 국가교육위원회, 방송미디어통신위원회, 금융위원회, 공정거래위원회, 국민권익위원회 등'],
  ['공사·공단','341개 기관 후보 등록','주무부처별 전체 목록을 기관 레지스트리에 반영하고 ALIO 공식 기준 대조 후 사업공고 수집원을 순차 활성화'],
  ['지방자치단체','17개 광역 + 226개 기초','시·도 및 시·군·구 고시공고, 보탬e 연계 지방보조사업'],
];

function daysUntil(value:string|null) {
  if(!value) return 99;
  return Math.max(0,Math.ceil((new Date(value).getTime()-Date.now())/86400000));
}
function getReviewReason(title:string,closesAt:string|null) {
  if(/(입찰|용역|공시송달|주관사업자 선정)/.test(title)) return '공모 유형 확인';
  if(!closesAt) return '마감일 확인';
  return null;
}

export default function Home() {
  const [notices,setNotices]=useState<Notice[]>([]); const [query,setQuery]=useState(''); const [group,setGroup]=useState('전체'); const [region,setRegion]=useState('전체 지역');
  const [saved,setSaved]=useState<string[]>([]); const [showSaved,setShowSaved]=useState(false); const [mode,setMode]=useState<'connecting'|'live-db'|'fallback'>('connecting'); const [deviceKey,setDeviceKey]=useState('');
  const [checks,setChecks]=useState<SourceCheck[]>([]); const [syncing,setSyncing]=useState(false); const [collection,setCollection]=useState<CollectionSummary|null>(null); const [reviewOnly,setReviewOnly]=useState(false);
  const [sourceCount,setSourceCount]=useState<number|null>(null);
  const [syncError,setSyncError]=useState('');
  const [advanced,setAdvanced]=useState({...defaultFilters});
  const [reviews,setReviews]=useState<Record<string,'approved'|'excluded'>>({});
  useEffect(()=>{
    const key=localStorage.getItem('gongmoa-device')||crypto.randomUUID().replaceAll('-',''); localStorage.setItem('gongmoa-device',key); setDeviceKey(key);
    fetch('/api/notices').then(r=>r.ok?r.json():Promise.reject()).then(raw=>{const data=raw as {items:Array<{id:string;institution:string;group:string;region:string|null;title:string;deadlineLabel:string;closesAt:string|null;category:string;audience:string;sourceName:string;sourceUrl:string;relatedCount:number;relatedSources:string[]}>};
      setNotices(data.items.map(n=>({details:n as unknown as SearchRecord,id:n.id,org:n.institution,group:n.group,region:n.region,title:n.title,due:n.deadlineLabel,dday:daysUntil(n.closesAt),tag:n.category,audience:n.audience,source:n.sourceName,url:n.sourceUrl,reviewReason:getReviewReason(n.title,n.closesAt),relatedCount:n.relatedCount||0,relatedSources:n.relatedSources||[]})));
      setSourceCount(((raw as {sources?:Array<{id:string}>}).sources||[]).filter(s=>s.id!=='gov24-orgs').length);setMode('live-db');
    }).catch(()=>setMode('fallback'));
    fetch(`/api/bookmarks?deviceKey=${key}`).then(r=>r.ok?r.json():Promise.reject()).then(raw=>{const data=raw as {items:Array<{noticeId:string}>};setSaved(data.items.map(x=>x.noticeId))}).catch(()=>{});
    fetch('/api/sync').then(r=>r.ok?r.json():Promise.reject()).then(raw=>setChecks((raw as {items:SourceCheck[]}).items)).catch(()=>{});
    fetch('/api/reviews').then(r=>r.ok?r.json():Promise.reject()).then(raw=>{const items=(raw as {items:Array<{noticeId:string;decision:'approved'|'excluded'}>}).items;setReviews(Object.fromEntries(items.map(x=>[x.noticeId,x.decision])))}).catch(()=>{});
  },[]);
  const latestChecks=useMemo(()=>latestSourceChecks(checks),[checks]);
  const pendingCount=notices.filter(n=>n.reviewReason&&!reviews[n.id]).length;
  const regions=useMemo(()=>['전체 지역',...Array.from(new Set(notices.map(n=>n.region).filter((x):x is string=>Boolean(x)))).sort((a,b)=>a.localeCompare(b,'ko'))],[notices]);
  const baseFiltered=useMemo(()=>notices.filter(n=>reviews[n.id]!=='excluded'&&(group==='전체'||n.group===group)&&(region==='전체 지역'||n.region===region)&&(!showSaved||saved.includes(n.id))&&(!reviewOnly||(n.reviewReason&&!reviews[n.id]))&&(`${n.org} ${n.region||''} ${n.title} ${n.tag} ${n.audience}`).toLowerCase().includes(query.toLowerCase())),[notices,query,group,region,saved,showSaved,reviewOnly,reviews]);
  const filtered=useMemo(()=>advancedSearch(baseFiltered,advanced),[baseFiltered,advanced]);
  const toggle=(id:string)=>{const next=!saved.includes(id);setSaved(s=>next?[...s,id]:s.filter(x=>x!==id));if(deviceKey)fetch('/api/bookmarks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({deviceKey,noticeId:id,saved:next})}).catch(()=>{});};
  const review=async(id:string,decision:'approved'|'excluded')=>{const previous=reviews[id];setReviews(x=>({...x,[id]:decision}));const response=await fetch('/api/reviews',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({noticeId:id,decision})});if(!response.ok)setReviews(x=>{const next={...x};if(previous)next[id]=previous;else delete next[id];return next})};
  const runSync=async()=>{setSyncing(true);setSyncError('');try{const totals:CollectionSummary={discovered:0,inserted:0,updated:0,unchanged:0,review:0,closed:0};const latest:SourceCheck[]=[];for(let batch=0;batch<4;batch++){const response=await fetch(`/api/sync?batch=${batch}`,{method:'POST'});if(!response.ok)throw new Error();const data=await response.json() as {results:SourceCheck[];collection:CollectionSummary};latest.push(...data.results);for(const key of Object.keys(totals) as Array<keyof CollectionSummary>)totals[key]+=data.collection[key]||0;setChecks([...latest]);setCollection({...totals});}const refreshed=await fetch('/api/notices').then(r=>r.json()) as {items:Array<{id:string;institution:string;group:string;region:string|null;title:string;deadlineLabel:string;closesAt:string|null;category:string;audience:string;sourceName:string;sourceUrl:string;relatedCount:number;relatedSources:string[]}>};setNotices(refreshed.items.map(n=>({details:n as unknown as SearchRecord,id:n.id,org:n.institution,group:n.group,region:n.region,title:n.title,due:n.deadlineLabel,dday:daysUntil(n.closesAt),tag:n.category,audience:n.audience,source:n.sourceName,url:n.sourceUrl,reviewReason:getReviewReason(n.title,n.closesAt),relatedCount:n.relatedCount||0,relatedSources:n.relatedSources||[]})));setMode('live-db');}catch{setSyncError('일부 수집 또는 새 목록 불러오기에 실패했습니다. 마지막 표시 자료는 유지됩니다. 잠시 후 다시 시도해 주세요.');}finally{setSyncing(false)}};
  return <main>
    <header className="topbar"><a className="brand" href="#"><span>공</span>모아</a><nav><a href="#notices">공모 찾기</a><a href="#sources">수집 범위</a><button onClick={()=>setShowSaved(v=>!v)} className={showSaved?'active':''}>관심 공모 {saved.length}</button></nav></header>
    <section className="hero"><div className="eyebrow">대한민국 공모사업 통합 탐색</div><h1>흩어진 공모사업,<br/><em>한곳에서 놓치지 않게.</em></h1><p>정부 부처부터 위원회, 공사·공단, 지방자치단체까지 공식 공고를 모아 정리합니다.</p><form className="search" onSubmit={e=>{e.preventDefault();document.querySelector('#notices')?.scrollIntoView()}}><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="공모 검색" placeholder="기관명, 사업명, 지원 분야를 검색하세요"/><button>검색</button></form><div className="quick"><span>빠른 탐색</span>{['창업','수출','교육','환경'].map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>)}</div></section>
    <section className="overview"><div><b>{notices.filter(n=>reviews[n.id]!=='excluded').length}</b><span>저장된 공모</span></div><div><b>{pendingCount}</b><span>검토 필요</span></div><div><b>{sourceCount??'—'}</b><span>연결된 공고 수집 출처</span></div><div><b className={mode==='live-db'?'live':'pending'}>{mode==='live-db'?'LIVE':mode==='fallback'?'연결 실패':'연결 중'}</b><span>데이터 저장소</span></div></section>
    <section className="content" id="notices"><div className="sectionhead"><div><span>OPEN CALLS</span><h2>{reviewOnly?'검토 대기 공모':showSaved?'저장한 공모':'공모사업 둘러보기'}</h2></div><p>{filtered.length}건 표시 · {mode==='live-db'?'실제 수집 자료':mode==='connecting'?'불러오는 중':'연결 확인 필요'}</p></div><div className="filters" role="group" aria-label="공모 필터">{groups.map(g=><button className={group===g?'selected':''} onClick={()=>setGroup(g)} key={g}>{g}</button>)}<label className="regionFilter"><span>지역</span><select value={region} onChange={e=>setRegion(e.target.value)} aria-label="지역 필터">{regions.map(r=><option key={r}>{r}</option>)}</select></label><button className={reviewOnly?'selected reviewFilter':'reviewFilter'} onClick={()=>setReviewOnly(v=>!v)}>검토 필요 {pendingCount}</button></div>
      {mode==='fallback'&&<div role="alert" className="dataError">공고 목록을 불러오지 못했습니다. 예시 자료를 실제 공고 대신 표시하지 않습니다.<button onClick={()=>window.location.reload()}>다시 불러오기</button></div>}
      {mode==='live-db'&&<DataQualityPanel items={notices.filter(n=>reviews[n.id]!=='excluded').map(n=>n.details||{})}/>}
      <AdvancedSearch items={notices} value={advanced} onChange={setAdvanced}/>
      {filtered.length?<div className="noticegrid">{filtered.map((n,i)=><article key={n.id} className="notice"><div className="meta"><span className={`tag t${i%4}`}>{n.tag}</span><button onClick={()=>toggle(n.id)} aria-label="관심 공모 저장">{saved.includes(n.id)?'★':'☆'}</button></div>{n.relatedCount>0&&<div className="relatedBadge" title={n.relatedSources.join(' · ')}>관련 공고 {n.relatedCount}건 연결</div>}{n.reviewReason&&!reviews[n.id]&&<><div className="reviewBadge">검토 · {n.reviewReason}</div><div className="reviewActions"><button onClick={()=>review(n.id,'approved')}>공모 승인</button><button onClick={()=>review(n.id,'excluded')}>목록 제외</button></div></>}<p>{n.group} · {n.org}</p><h3><a href={n.url} target="_blank" rel="noreferrer">{n.title}</a></h3><div className="audience">지원대상 · {n.audience}</div><NoticeFacts details={n.details}/><a className="source" href={n.url} target="_blank" rel="noreferrer">{n.source} 원문 ↗</a></article>)}</div>:<div className="empty">{mode==='connecting'?'공고 목록을 불러오는 중입니다.':mode==='fallback'?'연결 복구 후 실제 공고를 표시합니다.':'조건에 맞는 공모가 없습니다. 검색어나 기관 유형을 바꿔보세요.'}</div>}
    </section>
    <BojoBackfillPanel/>
    <CentralInstitutions onSearch={name=>{setQuery(name);setGroup('전체');setRegion('전체 지역');setShowSaved(false);setReviewOnly(false);setAdvanced({...defaultFilters});document.getElementById('notices')?.scrollIntoView({behavior:'smooth'});}}/>
    <section className="scope" id="sources"><div className="scopeintro"><span>COLLECTION MAP</span><h2>기관 등록과 수집 연결 현황</h2><p>부·처·청은 공식 기관별 기구도와 대조했습니다. 공공기관과 지자체의 직접 수집 연결은 단계적으로 확장합니다.</p></div><div className="scopegrid">{institutions.map((x,i)=><article key={x[0]}><i>0{i+1}</i><h3>{x[0]}</h3><strong>{x[1]}</strong><p>{x[2]}</p></article>)}</div></section>
    <section className="pipeline"><div><span>공식 출처 레지스트리</span><b>수집 상태 기록</b></div><i>→</i><div><span>원문 해시 비교</span><b>중복·변경 감지</b></div><i>→</i><div><span>마감일·대상 정규화</span><b>검증 대기열</b></div><i>→</i><div><span>기기별 영구 저장</span><b>관심 공모 동기화</b></div></section>
    <section className="syncCenter"><div className="syncHead"><div><span>SOURCE MONITOR</span><h2>공식 출처 수집 상태</h2><p>최근 실행 기록에서 출처별 마지막 상태를 표시합니다. 접근 정상은 전체 공고 수집 완료를 뜻하지 않습니다.</p></div><button onClick={runSync} disabled={syncing}>{syncing?'수집 중…':'지금 공고 수집'}</button></div>{syncError&&<p role="alert" className="dataError">{syncError}</p>}{collection&&<div className="collectionSummary"><span>발견 <b>{collection.discovered}</b></span><span>신규 <b>{collection.inserted}</b></span><span>변경 <b>{collection.updated}</b></span><span>동일 <b>{collection.unchanged}</b></span><span>마감분리 <b>{collection.closed}</b></span></div>}<div className="syncGrid">{latestChecks.length?latestChecks.map(check=><article key={check.id}><div><i className={check.outcome==='success'&&!isStaleCheck(check.finishedAt)?'ok':'warn'}></i><strong>{check.pageTitle||check.sourceId}</strong></div><p>{isStaleCheck(check.finishedAt)?'최근 12시간 내 확인 없음 · 재확인 필요':check.outcome==='success'?`접근 정상 · 키워드 ${check.keywordHits??0}회 · ${Math.round((check.contentBytes||0)/1024).toLocaleString()}KB`:check.message||'확인 필요'}</p><time>{new Date(check.finishedAt).toLocaleString('ko-KR')}</time></article>):<div className="syncEmpty">아직 실행 이력이 없습니다. 수집을 실행하면 상태와 변경 기준 해시가 저장됩니다.</div>}</div><small>통합포털·5개 중앙부처·10개 광역지자체·공공기관 지원공고를 함께 수집합니다.</small></section>
    <section className="sources"><h2>연결된 공식 출처</h2><div><a href="https://www.bojo.go.kr/retrieveSearchPubBiz.do" target="_blank">보조금통합포털 <small>기획예산처 API</small></a><a href="https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do" target="_blank">기업마당 <small>공개 게시판</small></a><a href="https://www.moe.go.kr/boardCnts/listRenew.do?boardID=72761&m=020502&s=moe" target="_blank">교육부 <small>사업공고</small></a><a href="https://www.mcst.go.kr/site/s_notice/notice/noticeList.jsp" target="_blank">문화체육관광부 <small>공지</small></a><a href="https://www.mois.go.kr/frt/bbs/type013/commonSelectBoardList.do?bbsId=BBSMSTR_000000000006" target="_blank">행정안전부 <small>알립니다</small></a><a href="https://me.go.kr/home/web/board/list.do?boardMasterId=39&menuId=10524" target="_blank">기후에너지환경부 <small>공지·공고</small></a><a href="https://www.seoul.go.kr/news/news_notice.do?selmenu=M00000107" target="_blank">서울특별시 <small>고시·공고</small></a><a href="https://www.busan.go.kr/nbgosi" target="_blank">부산광역시 <small>고시공고</small></a><a href="https://www.incheon.go.kr/IC010307/list?curPage=1" target="_blank">인천광역시 <small>고시공고</small></a><a href="https://www.daejeon.go.kr/online/recruitmentNoticeList.do" target="_blank">대전광역시 <small>공모·모집</small></a><a href="https://minwon.daegu.go.kr/pssrp/list" target="_blank">대구광역시 <small>공모·모집</small></a><a href="https://www.ulsan.go.kr/u/rep/transfer/notice/list.ulsan?mId=001004002000000000" target="_blank">울산광역시 <small>고시공고</small></a><a href="https://www.jeonbuk.go.kr/board/list.jeonbuk?boardId=BBS_0000129&menuCd=DOM_000000102002005000" target="_blank">전북특별자치도 <small>공고·고시</small></a><a href="https://www.gyeongnam.go.kr/giup/index.gyeong" target="_blank">경상남도 <small>경남기업119 지원사업</small></a><a href="https://www.gov.kr/portal/orgSite" target="_blank">정부24 <small>기관 기준정보</small></a></div><p>기관별 공개 게시판은 3시간 주기로 구조 변경과 신규 공고를 함께 확인합니다.</p></section>
    <footer className="footer"><a className="brand" href="#"><span>공</span>모아</a><p>공식 원문을 가장 먼저 확인하세요. 공모아는 탐색을 돕는 통합 안내 서비스입니다.</p><a href="mailto:hello@gongmoa.kr">제보·문의</a></footer>
  </main>
}
