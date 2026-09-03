import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {fetchKiatList,parseKiatBoard,parseNipaBoard} from '../lib/public-collectors.ts';
const now=Date.parse('2026-09-03T12:00:00Z');
const kiatRow=(id:string,title:string)=>`<tr><td class="td_title"><a href="javascript:contentsView('${id}')">${title}</a></td><td class="td_reg_date">2026-08-28</td><td><span class="app_state" data-start="2026-08-28" data-end="2026-09-28"></span></td></tr>`;
const kiatBody=(titles:string[])=>'<table><caption>사업공고 리스트 화면</caption><thead>접수기간</thead><tbody>'+titles.map((t,i)=>kiatRow(String(i).padStart(32,'0'),t)).join('')+'</tbody></table>';
test('KIAT fixed POST request cannot redirect or accept caller URLs',async()=>{
  await fetchKiatList(async(input,init)=>{assert.equal(input,'https://www.kiat.or.kr/front/board/boardContentsListAjax.do');assert.equal(init?.method,'POST');assert.equal(init?.redirect,'manual');assert.equal(new URLSearchParams(String(init?.body)).get('board_id'),'90');assert.ok(init?.signal);return new Response('ok');});
});
test('KIAT retains recruitment selection exception, rejects noise and preserves date-only semantics',()=>{
  const body=kiatBody(['2026년도 독일 등 유럽 진출 희망 중견기업 지원사업 선정 공고','기술개발사업 공고','기술 수요조사 공고','유공자 포상 모집','사업공고 작성 안내','지원제도 안내','연구원 채용 공고','지원사업 선정 공고']);
  const parsed=parseKiatBoard(body,now);assert.equal(parsed.items.length,2);
  const first=parsed.items[0];assert.equal(first.announcedFrom,'2026-08-28');assert.equal(first.applicationTo,'2026-09-28');assert.match(first.deadlineLabel,/일자 기준/);assert.equal(first.closesAt?.toISOString(),'2026-09-28T14:59:59.000Z');
  assert.equal(parseKiatBoard(body,Date.parse('2026-09-29T00:00:00+09:00')).items[0].status,'closed');
  assert.equal(parseKiatBoard(body.replace('</tbody>',kiatRow('0'.repeat(32),'기술개발사업 공고')+'</tbody>'),now).items.length,2);
  for(const bad of [body.replace('0'.repeat(32),'evil'),body.replace('data-end="2026-09-28"','data-end="2026-02-30"'),body.replace('<caption>사업공고 리스트 화면</caption>',''),'<html>오류</html>'])assert.throws(()=>parseKiatBoard(bad,now));
  assert.equal(parseKiatBoard(kiatBody(['채용 공고','포상 공고','입찰 공고']),now).items.length,0);
});
const nipaRow=(id:string,title:string)=>`<tr><td>1</td><td class="tl"><div><a href="/home/2-2/${id}">${title}</a><span class="bco">신청기간 : 2026-09-03 15:00 ~ 2026-09-23 15:00</span></div></td><td><span class="bco">2026-09-03</span></td></tr>`;
test('NIPA keeps exact KST cutoff, validates official path and distinguishes errors from zero candidates',()=>{
  const body='<table class="tbgg"><tbody>'+nipaRow('16921','AI 사업 공고')+nipaRow('16900','입주기업 모집')+nipaRow('16899','산업 유공자 포상 공고')+'</tbody></table>';
  const parsed=parseNipaBoard(body,now);assert.equal(parsed.parsedRows,3);assert.equal(parsed.items.length,2);assert.equal(parsed.items[0].closesAt.toISOString(),'2026-09-23T06:00:00.000Z');assert.equal(parsed.items[0].sourceUrl,'https://www.nipa.kr/home/2-2/16921');
  assert.throws(()=>parseNipaBoard(body.replaceAll(' 15:00',''),now));
  assert.equal(parseNipaBoard(body,Date.parse('2026-09-23T15:01:00+09:00')).items[0].status,'closed');
  for(const bad of [body.replace('/home/2-2/16921','https://evil.test/16921'),body.replace('/home/2-2/16921','/home/2-3/16921'),body.replace('2026-09-23 15:00','2026-09-23 25:00'),body.replace('신청기간','게시기간'),body.replace('class="tbgg"','class="other"')])assert.throws(()=>parseNipaBoard(bad,now));
  assert.equal(parseNipaBoard(body.replace('AI 사업 공고','채용 공고').replace('입주기업 모집','입찰 공고'),now).items.length,0);
});
