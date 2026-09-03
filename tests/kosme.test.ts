import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node runner.
import {fetchKosmeList,kosmeSource,parseKosmeBoard} from '../lib/public-collectors.ts';
const row=(id:string,title:string)=>`<tr onClick="javascript:Board.Move('frmInfo', 'board13View.do', '', ${id})"><td>1</td><td>${title}</td><td>2026-08-26</td><td>100</td></tr></tr>`;
const body=(titles:string[])=>'<div class="board_table"><table><tr><th>제목</th><th>작성일</th></tr>'+titles.map((t,i)=>row(String(1351+i),t)).join('')+'</table></div>';
test('KOSME fixed official request is bounded and does not follow redirects',async()=>{
  await fetchKosmeList(async(input,init)=>{assert.equal(input,kosmeSource.url);assert.equal(init?.redirect,'manual');assert.ok(init?.signal);return new Response('ok');});
});
test('KOSME beneficiary enterprises only, with unknown application dates and deduplicated IDs',()=>{
  const html=body(['CBAM 사업 수요기업 모집 공고','설비투자 지원 참여기업 모집','배출량 검증기관 모집 공고','원가계산기관 모집공모','수강생 모집 안내','참여기업 모집 선정결과','평가위원 모집','사업설명회 참여기업 모집','직원 채용 공고']);
  const parsed=parseKosmeBoard(html);assert.equal(parsed.parsedRows,9);assert.equal(parsed.items.length,2);
  assert.equal(parsed.items[0].sourceUrl,'https://kdoctor.kosmes.or.kr/esgplatform/board/board13View.do?idx=1351');
  assert.equal(parsed.items[0].announcedFrom,'2026-08-26');assert.equal(parsed.items[0].applicationTo,null);assert.equal(parsed.items[0].closesAt,null);assert.match(parsed.items[0].deadlineLabel,/원문 확인/);
  assert.equal(parseKosmeBoard(html.replace('</table>',row('1351','CBAM 사업 수요기업 모집 공고')+'</table>')).items.length,2);
  assert.equal(parseKosmeBoard(body(['채용 공고','자료 공유','설명회 안내'])).items.length,0);
});
test('KOSME malformed rows fail the whole page, even if that row is noise',()=>{
  const html=body(['CBAM 사업 수요기업 모집 공고','자료 공유','설명회 안내']);
  for(const bad of [html.replace('board13View.do','board12View.do'),html.replace('1353','evil'),html.replace('2026-08-26','2026-02-30'),html.replace('board_table','other'),html.replace('작성일','접수일'),'<html>접근 오류</html>'])assert.throws(()=>parseKosmeBoard(bad));
});
