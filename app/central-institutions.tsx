'use client';
import {useEffect,useState} from 'react';
type Item={id:string;name:string;type:string;scope:string;aliases:string[];registered:boolean;directSources:Array<{name:string;status:string}>};
export default function CentralInstitutions({onSearch}:{onSearch:(name:string)=>void}){
  const [items,setItems]=useState<Item[]>([]),[query,setQuery]=useState(''),[type,setType]=useState('전체'),[error,setError]=useState('');
  const load=()=>{setError('');fetch('/api/institutions').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(raw=>{const d=raw as {items:Item[]};if(!Array.isArray(d.items))throw new Error();setItems(d.items);}).catch(()=>setError('기관 목록을 불러오지 못했습니다.'));};
  useEffect(()=>{load();},[]);
  const visible=items.filter(x=>(type==='전체'||(type==='별도 처'?x.scope!=='중앙행정기관':x.scope==='중앙행정기관'&&x.type===type))&&[x.name,...x.aliases].some(n=>n.includes(query.trim())));
  return <section className="centralRegistry" id="central-institutions"><h2>중앙부처 기관 목록</h2><p>공식 명단 확인: 2026-09-02 · 기관 등록과 공고 수집 연결은 별개입니다. 공고 0건은 사업이 없다는 뜻이 아닙니다.</p>
    <div className="filters"><label>기관명 <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="부·처·청 이름 검색"/></label><label>분류 <select value={type} onChange={e=>setType(e.target.value)}>{['전체','부','처','청','별도 처'].map(t=><option key={t}>{t}</option>)}</select></label></div>
    {error?<p role="alert">{error} <button onClick={load}>다시 시도</button></p>:items.length===0?<p>기관 목록을 불러오는 중입니다.</p>:<><p>등록 {items.filter(x=>x.registered).length} / {items.length}개 · 부 {items.filter(x=>x.type==='부').length} · 처 {items.filter(x=>x.type==='처'&&x.scope==='중앙행정기관').length} · 청 {items.filter(x=>x.type==='청').length} · 별도 처 {items.filter(x=>x.scope!=='중앙행정기관').length}</p><div className="registryTable"><table><thead><tr><th>분류</th><th>기관명</th><th>등록·직접 수집 상태</th><th>저장된 공고</th></tr></thead><tbody>{visible.map(x=><tr key={x.id}><td>{x.scope==='중앙행정기관'?x.type:'별도 처'}</td><td>{x.name}</td><td>{!x.registered?'등록 대기':x.directSources.length?x.directSources.every(s=>s.status==='connected')?'등록 완료 · 직접 수집 연결':'등록 완료 · 수집 점검 필요':'등록 완료 · 직접 수집 미연결'}</td><td><button onClick={()=>onSearch(x.name)}>기관명으로 검색</button></td></tr>)}</tbody></table>{visible.length===0&&<p>조건에 맞는 기관이 없습니다.</p>}</div></>}
    <p>별도 처: 대통령경호처·고위공직자범죄수사처(중앙행정기관에 준하는 기관). 위원회·실·원·사무처는 이번 부·처·청 등록 범위에서 제외합니다. <a href="https://www.org.go.kr/cop/bbs/getInstiChartList.do" target="_blank" rel="noreferrer">공식 기관별 기구도 ↗</a></p></section>;
}
