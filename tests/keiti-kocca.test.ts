import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {fetchKeitiList,parseKeitiBoard,parseKoccaBoard} from '../lib/public-collectors.ts';
const row=(id:number,title:string)=>`<li><a href="/site/keiti/ex/board/View.do?cbIdx=277&amp;bcIdx=${id}"><span class="date">2026-08-11</span><span class="subject">${title}</span><span class="text">다른 사업 모집 요약</span></a></li>`;
const page=(start=1)=>'<div class="thumb"><ul class="list col5">'+row(start,'환경산업 지원사업 공고')+row(start+1,'녹색금융 우수기업 시상 공모')+row(start+2,'일반교육 교육생 모집')+'</ul></div>';
test('KEITI validates official board identities, separates title from summary and excludes awards',()=>{
  const p=parseKeitiBoard(page());assert.equal(p.parsedRows,3);assert.equal(p.items.length,1);assert.equal(p.items[0].externalId,'1');assert.equal(p.items[0].applicationFrom,null);assert.equal(p.items[0].announcedFrom,'2026-08-11');
  assert.equal(parseKeitiBoard(page().replace('환경산업 지원사업 공고','세미나 안내')).items.length,0);
  for(const bad of [page().replace('cbIdx=277','cbIdx=278'),page().replace('/site/keiti/ex/board/View.do','https://evil.test/site/keiti/ex/board/View.do'),page().replace('bcIdx=1','bcIdx=bad'),page().replace('2026-08-11','2026-02-30'),'<html>차단</html>'])assert.throws(()=>parseKeitiBoard(bad));
});
test('KEITI three fixed pages share a deadline; partial failure or repeated pages cannot succeed',async()=>{
  const signals:unknown[]=[];
  const r=await fetchKeitiList(async(input,init)=>{const u=new URL(String(input));assert.equal(u.hostname,'www.keiti.re.kr');assert.equal(u.searchParams.get('cbIdx'),'277');assert.equal(init?.redirect,'manual');signals.push(init?.signal);return new Response(page(Number(u.searchParams.get('pageIndex'))*10));});
  assert.equal(new Set(signals).size,1);assert.equal(parseKeitiBoard(await r.text()).items.length,3);
  await assert.rejects(fetchKeitiList(async()=>new Response(page())),/중복/);
  await assert.rejects(fetchKeitiList(async(input)=>String(input).endsWith('3')?new Response('error',{status:503}):new Response(page())),/HTTP 503/);
  await assert.rejects(fetchKeitiList(async()=>new Response('<html>구조 변경</html>')));
  const pinned=await fetchKeitiList(async(input)=>new Response(page(Number(new URL(String(input)).searchParams.get('pageIndex'))*10).replace('<ul class="list col5">','<ul class="list col5">'+row(999,'고정 지원사업 공고'))));
  assert.equal(parseKeitiBoard(await pinned.text()).items.length,4);
});
const koRow=(id:string,title:string)=>`<tr><td data-label="제목"><a href="/kocca/pims/view.do?intcNo=${id}&amp;menuNo=204104">${title}</a></td><td data-label="공고일">26.08.31</td><td data-label="접수기간">26.08.31 ~ 26.09.21</td></tr>`;
test('KOCCA preserves actual reception year, rejects instructors and ignores continuous placeholder deadline',()=>{
  const body='<table>'+koRow('326D00085009','2027 콘텐츠 아메리카 참가기업 모집')+koRow('326D00034004','글로벌게임허브 입주기업 모집(상시)')+koRow('326D00034006','AI 강사 Pool 모집')+'</table>';
  const p=parseKoccaBoard(body,Date.parse('2026-09-03T00:00Z'));assert.equal(p.items.length,2);assert.equal(p.items[0].applicationFrom,'2026-08-31');assert.equal(p.items[0].applicationTo,'2026-09-21');assert.equal(p.items[1].closesAt,null);assert.equal(p.items[1].applicationTo,null);assert.match(p.items[1].deadlineLabel,/상시/);
  const continuous=koRow('326D00034004','글로벌게임허브 입주기업 모집(상시)');
  for(const value of ['상시',''])assert.equal(parseKoccaBoard(body.replace(continuous,continuous.replace('26.08.31 ~ 26.09.21',value))).items[1].applicationTo,null);
  for(const bad of [body.replace('menuNo=204104','menuNo=204105'),body.replace('/kocca/pims/view.do','https://evil.test/kocca/pims/view.do'),body.replace('26.09.21','26.02.30'),body.replace('intcNo=326D00085009','intcNo=evil')])assert.throws(()=>parseKoccaBoard(bad));
});
