import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner requires explicit extension.
import {parseKoatBoard,fetchKoatList,koatSource} from '../lib/koat-collector.ts';
const row=(id:string,title:string,day='2026-09-01')=>`<tr onclick="postLink(${id})"><td>99</td><td class="textCut"><a href="#" onclick="postLink(${id})">${title}</a></td><td>첨부</td><td></td><td>${day}</td><td>1</td></tr>`;
const page=(rows:string)=>`<table><thead>등록일</thead><tbody>${rows}</tbody></table>`;
test('KOAT keeps farmer and individual opportunities, drops results and internships',()=>{
  const r=parseKoatBoard(page(row('1','참여농가 모집')+row('2','예비창업자 지원사업 모집')+row('3','인턴십 모집')+row('4','참여농가 선정결과')));
  assert.equal(r.parsedRows,4);assert.deepEqual(r.items.map(n=>n.externalId),['1','2']);
  assert.equal(r.items[0].sourceUrl,'https://www.koat.or.kr/board/business/1/view.do');assert.equal(r.items[0].applicationTo,null);
});
test('KOAT deduplicates IDs, strips fake rows and accepts zero candidates',()=>{
  const r=parseKoatBoard(page(row('1','참여농가 모집')+row('1','참여농가 모집')+row('2','선정결과'))+`<!--${row('8','공모')}-->`);
  assert.equal(r.items.length,1);
  assert.equal(parseKoatBoard(page(row('1','선정결과')+row('2','인턴 모집')+row('3','심사원 모집'))).items.length,0);
});
test('KOAT fails entire page on malformed noncandidate row or invalid day',()=>{
  const good=row('1','참여농가 모집')+row('2','개인 지원사업');
  assert.throws(()=>parseKoatBoard(page(good+row('oops','선정결과'))));
  assert.throws(()=>parseKoatBoard(page(good+row('3','선정결과','2026-02-30'))));
  assert.throws(()=>parseKoatBoard(page(good+row('3','공모').replace('postLink(3)','postLink(4)'))));
  assert.throws(()=>parseKoatBoard('<h1>접근 오류</h1>'));
});
test('KOAT request is a bounded fixed official path with no redirect following',async()=>{
  let called=false;
  await fetchKoatList((async(url,init)=>{called=true;assert.equal(url,koatSource.url);assert.equal(init?.redirect,'manual');assert.ok(init?.signal);return new Response('ok');}) as typeof fetch);
  assert.ok(called);
});
