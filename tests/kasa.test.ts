import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {centralCollectors,parseCentralBoard} from '../lib/central-collectors.ts';
const c=centralCollectors.find(x=>x.id==='kasa-board')!;
const wrap=(body:string)=>'<form id="searchForm" action="/bbs/BBSMSTR_000000000018/list.do"></form><form id="deleteForm">'+body+'</form>';
const row=(id:string,title:string)=>`<div class="program__board-row" role="row"><div class="program__board-cell subject" role="cell"><button onclick="fn_search_detail('${id}'); return false;"><strong class="board__subject-text">${title}</strong></button></div><div class="program__board-cell regDate" aria-label="등록일"><span class="td">2026-08-07</span></div></div>`;
test('KASA preserves opaque IDs, removes pinned duplicates and excludes non-grant announcements',()=>{
  const titles=['2026년도 신규프로젝트 탐색연구사업 재공고&#40;기획연구&#41;','2026년도 드론 개발 사업 신규과제 공고(수정)','2026년도 첨단제조 실증 지원 기반구축 사업 공고(재공고)','통합 기술수요조사 공고','자동판매기 관리위탁업체 모집','연구시설장비 심의 신청 안내','우주신기술지정제 사업 공고','계약 발주계획','연구사업 입찰 공고'];
  const body=wrap(titles.map((t,i)=>row(`B00000000339${i}Rb8lK2`,t)).join('')+row('B000000003390Rb8lK2',titles[0]));
  const result=parseCentralBoard(body,c);
  assert.equal(result.parsedRows,10);assert.equal(result.items.length,3);
  assert.equal(result.items[0].externalId,'B000000003390Rb8lK2');
  assert.equal(result.items[0].sourceUrl,'https://www.kasa.go.kr/bbs/BBSMSTR_000000000018/view.do?nttId=B000000003390Rb8lK2');
  assert.equal(result.items[0].title,'2026년도 신규프로젝트 탐색연구사업 재공고(기획연구)');
  assert.equal(result.items[0].announcedFrom,'2026-08-07');assert.equal(result.items[0].closesAt,null);
  for(const bad of [body.replaceAll('B000000003390Rb8lK2','123'),body.replaceAll('B000000003390Rb8lK2','https://evil.test/'),body.replace('<strong class="board__subject-text">','<strong>'),body.replace('2026-08-07','unknown'),'<html>접근 오류</html>'])assert.throws(()=>parseCentralBoard(bad,c));
  assert.equal(parseCentralBoard('<!--'+row('B000000003393Rb8lK2','추가 공모')+'--><script>'+row('B000000003393Rb8lK2','추가 공모')+'</script>'+body,c).items.length,3);
  assert.throws(()=>parseCentralBoard(body.replace('000000000018/list','000000000019/list'),c));
  assert.equal(parseCentralBoard(body.replaceAll('<div class="program__board-row" role="row">','<div role="row" class="program__board-row">'),c).items.length,3);
  assert.throws(()=>parseCentralBoard(body.replace('2026-08-07','').replaceAll('<div class="program__board-row" role="row">','<div role="row" class="program__board-row">'),c));
});
