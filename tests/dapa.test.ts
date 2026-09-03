import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {centralCollectors,parseCentralBoard} from '../lib/central-collectors.ts';
test('DAPA validates board and numeric view calls; preserves business consulting not personnel',()=>{
  const c=centralCollectors.find(x=>x.id==='dapa-board')!;
  const titles=['2026년 퇴직공무원 사회공헌사업(방위사업 Bridge와 함께 참여해요) 컨설팅 참여기업 모집 공고문','방위사업감독관 개방형 직위 공개모집','무기체계 연구개발사업 업체선정 입찰공고','방위산업 계약학과 지원사업 수요조사 공고','퇴직공무원 컨설턴트 모집'];
  const body='<input name="bbsSeq" value="443"><input name="menuSeq" value="3031"><table>'+titles.map((t,i)=>`<tr><td class="subject"><a href="#none" onclick="fn_selectDoc('${59017+i}')" class="subject-anchor"><p class="text">${t}</p><span>새 글</span></a></td><td>2026-08-18</td></tr>`).join('')+'</table>';
  const r=parseCentralBoard(body,c);assert.equal(r.parsedRows,5);assert.equal(r.items.length,1);assert.equal(r.items[0].title,titles[0]);assert.equal(r.items[0].externalId,'59017');assert.equal(r.items[0].announcedFrom,'2026-08-18');assert.equal(r.items[0].closesAt,null);
  assert.equal(r.items[0].sourceUrl,'https://www.dapa.go.kr/dapa/doc/selectDoc.do?bbsSeq=443&menuSeq=3031&docSeq=59017');
  assert.equal(parseCentralBoard(body.replace(titles[0],'일반 안내'),c).items.length,0);
  for(const prefix of ['<!--<input name="bbsSeq" value="443">-->','<script>const stale=\'<input name="bbsSeq" value="443">\';</script>'])assert.throws(()=>parseCentralBoard(prefix+body.replace('value="443"','value="444"'),c));
  for(const bad of [body.replace('value="443"','value="444"'),body.replace('value="3031"','value="9999"'),body.replace("fn_selectDoc('59017')","fn_selectDoc('abc')"),body.replace('<p class="text">','<p>'),'<html>오류</html>'])assert.throws(()=>parseCentralBoard(bad,c));
});
