import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Native Node test runner uses explicit extensions.
import {parseKawfBoard,kawfCandidate,fetchKawfList} from '../lib/kawf-collector.ts';
function row(id='19627',title='생활안정자금 융자 사업 안내',number='공지',date='26.08.18',url=''){
  return `<li role="row"><p role="cell" class="number">${number}</p><p role="cell" class="title Common_Bbs_Table_Type1_Item" data-pIdx="${id}" pUrl="${url}"><a href="#">${title}</a></p><p role="cell" class="date">${date}</p></li>`;
}
const wrap=(body:string)=>`<div class="board-list" role="table" aria-label="표 사업공고"><ul role="rowgroup">${body}</ul></div>`;
test('KAWF distinguishes loans and does not invent application dates',()=>{
  const [i]=parseKawfBoard(wrap(row())).items;assert.equal(i.category,'융자·금융지원(상환 필요)');assert.equal(i.status,'unknown');assert.equal(i.announcedFrom,'2026-08-18');assert.equal(i.applicationFrom,null);assert.equal(i.applicationTo,null);assert.equal(i.closesAt,null);assert.ok(i.sourceUrl.endsWith('selIdx=19627'));
});
test('KAWF recognizes ordinary rows and pinned rows separately',()=>{
  const p=parseKawfBoard(wrap(row()+row('19562','생활안정자금 융자 사업 안내','123')));assert.equal(p.pinned,1);assert.equal(p.parsedRows,2);assert.equal(p.items.length,2);
});
test('KAWF excludes follow-up noise and retains support opportunities',()=>{
  for(const t of ['심리상담 지원사업 접수 마감','보고서 제출','교부신청 대상자 교육 신청','지원사업 결과 발표','예술활동증명 제도 운영 안내','강사 모집'])assert.equal(kawfCandidate(t),false,t);
  for(const t of ['권리보호 교육 신청','예방 특강 신청','전자계약 서비스 지원','융자 사업 안내'])assert.equal(kawfCandidate(t),true,t);
});
test('KAWF updates existing closed/noise titles while keeping them hidden',()=>{
  const p=parseKawfBoard(wrap(row('19627','융자 사업 접수 마감')),['19627']);assert.equal(p.items[0].status,'closed');assert.equal(kawfCandidate(p.items[0].title),false);
});
test('KAWF rejects invalid dates, IDs and conflicting duplicates',()=>{
  for(const h of ['login',wrap(row('x')),wrap(row('19627','융자 안내','공지','26.02.30')),wrap(row()+row('19627','다른 융자 안내'))])assert.throws(()=>parseKawfBoard(h));
  assert.equal(parseKawfBoard(wrap(row()+row())).items.length,1);
});
test('KAWF does not attribute external redirects to this institution',()=>{
  const p=parseKawfBoard(wrap(row('1','융자 안내','공지','26.08.18','https://example.com')));assert.equal(p.items.length,0);assert.equal(p.external,1);
});
test('KAWF fetch uses fixed public endpoint without redirects',async()=>{
  await fetchKawfList((async(url,init)=>{assert.equal(String(url),'https://www.kawf.kr/notice/sub02.do');assert.equal(init?.redirect,'manual');return new Response('');}) as typeof fetch);
});
