import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {centralCollectors,parseCentralBoard,centralGrantCandidate} from '../lib/central-collectors.ts';
const c=centralCollectors[0];
test('MFDS research-call exception stays narrow and GMT publication becomes Korean date',()=>{
  const config=centralCollectors.find(x=>x.id==='mfds-board')!;
  const body='<rss><channel>'+['용역연구개발과제 주관연구기관 공모','용역연구개발과제 주관연구기관 공모 결과','연구 용역 입찰 모집','원장 후보자 모집'].map((t,i)=>`<item><title>${t}</title><link>https://www.mfds.go.kr/brd/m_76/view.do?seq=${i+1}</link><pubDate>Mon, 31 Aug 2026 18:00:00 GMT</pubDate></item>`).join('')+'</channel></rss>';
  const r=parseCentralBoard(body,config);assert.equal(r.items.length,1);assert.equal(r.items[0].title,'용역연구개발과제 주관연구기관 공모');assert.equal(r.items[0].announcedFrom,'2026-09-01');assert.equal(r.items[0].applicationFrom,null);
  assert.throws(()=>parseCentralBoard(body.replaceAll('/m_76/','/m_99/'),config));
  assert.equal(parseCentralBoard(body.replaceAll('Mon, 31 Aug','Mon, 30 Feb'),config).items[0].announcedFrom,null);
});
test('Forest uses full title, removes session identifiers and validates board',()=>{
  for(const [source,board] of [['forest-board','1032'],['forest-news','1031']]){
    const config=centralCollectors.find(x=>x.id===source)!;
    const body='<table>'+['산림 지원사업 공모','입찰 공고','채용 모집'].map((t,i)=>`<tr><td class="left"><a href="/kfsweb/cop/bbs/selectBoardArticle.do;jsessionid=temporary.node?bbsId=BBSMSTR_${board}&amp;nttId=${i+1}&amp;pageIndex=1" title="${t}">잘린 제목...</a></td><td>2026-09-02<td>첨부</td></tr>`).join('')+'</table>';
    const r=parseCentralBoard(body,config);assert.equal(r.parsedRows,3);assert.equal(r.items.length,1);
    assert.equal(r.items[0].title,'산림 지원사업 공모');assert.equal(r.items[0].announcedFrom,'2026-09-02');
    assert.equal(r.items[0].sourceUrl,`https://www.forest.go.kr/kfsweb/cop/bbs/selectBoardArticle.do?bbsId=BBSMSTR_${board}&nttId=1`);
    assert.throws(()=>parseCentralBoard(body.replaceAll('BBSMSTR_'+board,'BBSMSTR_9999'),config));
    assert.throws(()=>parseCentralBoard(body.replaceAll(' title=',' data-title='),config));
  }
});
test('KMA decodes escaped titles and preserves KST publication date',()=>{
  const config=centralCollectors.find(x=>x.id==='kma-board')!;
  const body='<rss><channel>'+[1,2,3].map(i=>`<item><title>아이디업&amp;#40;UP&amp;#41; 공모전</title><link>http://www.kma.go.kr/notify/notice/list.jsp?mode=view&amp;bid=gongzi&amp;num=${i}</link><pubDate>Thu Aug 27 08:17:39 KST 2026</pubDate></item>`).join('')+'</channel></rss>';
  const result=parseCentralBoard(body,config);
  assert.equal(result.items[0].title,'아이디업(UP) 공모전');assert.equal(result.items[0].announcedFrom,'2026-08-27');assert.equal(result.items[0].applicationFrom,null);
  assert.ok(result.items[0].sourceUrl.startsWith('https://www.kma.go.kr/'));
  assert.throws(()=>parseCentralBoard(body.replaceAll('bid=gongzi','bid=recruit'),config));
  assert.equal(parseCentralBoard(body.replaceAll('Aug 27','Feb 30'),config).items[0].announcedFrom,null);
});
test('RDA extracts official notice rows and rejects unrelated board identities',()=>{
  const config=centralCollectors.find(x=>x.id==='rda-board')!;
  const body='<table><caption>공지사항 리스트</caption>'+['산업체협력연구 참여기업 공모','면허 실기시험 시행계획','참여기업 선정 결과'].map((title,i)=>`<tr><td aria-label="제목"><a href="/board/board.do?boardId=ancmtt&amp;prgId=nei_ancmttEntry&amp;dataNo=${100+i}&amp;mode=updateCnt"><span>${title}</span></a></td><td aria-label="작성일">2026-08-12</td></tr>`).join('')+'</table>';
  const result=parseCentralBoard(body,config);
  assert.equal(result.parsedRows,3);assert.equal(result.items.length,1);
  assert.equal(result.items[0].externalId,'100');assert.equal(result.items[0].announcedFrom,'2026-08-12');assert.equal(result.items[0].applicationFrom,null);
  assert.throws(()=>parseCentralBoard(body.replaceAll('boardId=ancmtt','boardId=jobs'),config));
  assert.throws(()=>parseCentralBoard(body.replace('공지사항 리스트','접근 제한'),config));
});
test('KDCA relative official links and non-grant exclusions',()=>{
  const config=centralCollectors.find(x=>x.id==='kdca-board')!;
  const body='<rss><channel>'+['민간위탁사업 수행기관 공모','국민체험단 모집','면허 실기시험 시행계획'].map((title,i)=>`<item><title>${title}</title><link>/bbs/kdca/51/${312483+i}/artclView.do?layout=unknown</link><pubDate>2026-09-02 16:08:14.0</pubDate></item>`).join('')+'</channel></rss>';
  const result=parseCentralBoard(body,config);
  assert.equal(result.items.length,1);assert.equal(result.items[0].announcedFrom,'2026-09-02');
  assert.equal(result.items[0].sourceUrl,'https://www.kdca.go.kr/bbs/kdca/51/312483/artclView.do?layout=unknown');
  assert.throws(()=>parseCentralBoard(body.replaceAll('/kdca/51/','/kdca/53/'),config));
  assert.equal(centralGrantCandidate('박사 후 연수생 모집'),false);
});
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
