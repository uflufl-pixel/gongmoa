import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {centralCollectors,parseCentralBoard,centralGrantCandidate} from '../lib/central-collectors.ts';
const c=centralCollectors[0];
const rss=(titles:string[],host='www.mss.go.kr')=>`<rss><channel>${titles.map((t,i)=>`<item><title><![CDATA[${t}]]></title><link><![CDATA[https://${host}/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${i+100}]]></link><pubDate>20260901090226</pubDate></item>`).join('')}</channel></rss>`;
test('RSS imports official grants and keeps publication separate from reception',()=>{
  const r=parseCentralBoard(rss(['기업 모집 공고','사업 선정결과 공고','채용 모집 공고']),c);
  assert.equal(r.parsedRows,3);assert.equal(r.items.length,1);assert.equal(r.items[0].announcedFrom,'2026-09-01');assert.equal(r.items[0].opensAt,null);assert.equal(r.items[0].applicationFrom,null);
});
test('valid board with only non-grants is successful with zero candidates',()=>{
  assert.equal(parseCentralBoard(rss(['공무원 전입희망자 공개모집','지원사업 선정결과','입찰 공고']),c).items.length,0);
  for(const s of ['공모전 결과','정부포상 후보자 모집','공무원 전입 모집','연구 용역 모집'])assert.equal(centralGrantCandidate(s),false);
  assert.equal(centralGrantCandidate('연구개발사업 시행계획 공고'),true);
});
test('malformed feeds and nonofficial links cannot be marked successful',()=>{
  assert.throws(()=>parseCentralBoard('<html>접근 제한</html>',c));
  assert.throws(()=>parseCentralBoard(rss(['지원사업 공모']),c));
  assert.throws(()=>parseCentralBoard(rss(['기업 모집','기업 모집','기업 모집'],'example.com'),c));
});
test('ES board validates structure, extracts ID and ignores download links',()=>{
  const h='<table>'+[1,2,3].map(i=>`<tr><td><a href="/board.es?bid=0003&amp;act=view&amp;list_no=${i}" class="txt_title"><span class="sr_only">새글</span>지원사업 공모 ${i}</a></td><td data-label="등록일">2026-09-01</td></tr>`).join('')+'</table>';
  const r=parseCentralBoard(h,centralCollectors[3]);assert.equal(r.items.length,3);assert.equal(r.items[0].title,'지원사업 공모 1');assert.equal(r.items[0].externalId,'1');
});
