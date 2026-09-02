import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {centralCollectors,parseCentralBoard,centralGrantCandidate,centralCollectorUrl,modsReception} from '../lib/central-collectors.ts';
const c=centralCollectors[0];
test('MODS official RSS retains explicit reception cutoff and excludes monitoring recruitment',()=>{
  const config=centralCollectors.find(x=>x.id==='mods-board')!;
  const period='접수 기간2026.7.20.(월) ~ 8.9.(일) 23:59까지';
  const body=`<rss><channel>${['데이터송 공모전','정보공개 모니터단 모집','서포터즈 모집'].map((t,i)=>`<item><title>${t}</title><link>https://mods.go.kr/board.es?act=view&amp;bid=108&amp;list_no=${i+100}</link><pubDate>202607201230</pubDate><description><![CDATA[${period}]]></description></item>`).join('')}</channel></rss>`;
  const r=parseCentralBoard(body,config);assert.equal(r.items.length,1);assert.equal(r.items[0].applicationFrom,'2026-07-20');assert.equal(r.items[0].applicationTo,'2026-08-09');assert.equal(r.items[0].closesAt?.toISOString(),'2026-08-09T14:59:00.000Z');
  assert.throws(()=>parseCentralBoard(body.replaceAll('bid=108','bid=109'),config));
  assert.throws(()=>parseCentralBoard(body.replaceAll('https://mods.go.kr','https://example.com'),config));
  for(const bad of [period.replace('접수 기간','행사 기간'),period.replace('8.9.','2.30.'),period.replace('23:59','25:00'),period+period])assert.equal(modsReception(bad),null);
  assert.equal(modsReception('접수기간 미정'),null);
});
test('audited collector URL updates supersede stale registered URLs without changing other sources',()=>{
  assert.equal(centralCollectorUrl('khs-board','https://khs.go.kr/old'),'https://www.khs.go.kr/multiBbz/selectMultiBbzList.do?bbzId=newpublic&mn=NS_01_01');
  assert.equal(centralCollectorUrl('bizinfo','https://www.bizinfo.go.kr/existing'),'https://www.bizinfo.go.kr/existing');
  for(const config of centralCollectors)assert.equal(centralCollectorUrl(config.id,'stale'),config.url);
});
test('KHS strips session IDs and rejects nonofficial boards and award notices',()=>{
  const config=centralCollectors.find(x=>x.id==='khs-board')!;
  const titles=['전승공예품 악기은행 대여자 모집 공고','지원사업 공모전 수상자 공고','평가위원 후보자 모집 공고'];
  const body=titles.map((t,i)=>`<tr><td data-column="제목"><a href="/multiBbz/selectMultiBbzView.do;jsessionid=temporary.node1?id=${100+i}&amp;no=${200+i}&amp;bbzId=newpublic" class="b_tit" title="${t}">${t}</a></td><td data-column="등록일">2026-08-28</td></tr>`).join('');
  const r=parseCentralBoard(body,config);assert.equal(r.parsedRows,3);assert.equal(r.items.length,1);
  assert.equal(r.items[0].sourceUrl,'https://khs.go.kr/multiBbz/selectMultiBbzView.do?bbzId=newpublic&id=100&no=200&mn=NS_01_01');
  assert.equal(r.items[0].announcedFrom,'2026-08-28');assert.equal(r.items[0].applicationTo,null);
  assert.throws(()=>parseCentralBoard(body.replaceAll('newpublic','newexam'),config));
  assert.throws(()=>parseCentralBoard(body.replaceAll('href="/multiBbz','href="https://example.com/multiBbz'),config));
  assert.throws(()=>parseCentralBoard(body.replaceAll('no=','missing='),config));
});
test('MOJ uses official board identity and excludes award announcements and advisory recruitment',()=>{
  const config=centralCollectors.find(x=>x.id==='moj-board')!;
  const titles=['광역형 비자 사업 공모 안내','공모전 수상작 발표','난민참여자문단 모집 공고','출입국 현장투어 모집 안내'];
  const body=titles.map((t,i)=>`<tr><td class="_artclTdTitle" aria-label="제목" title="${t}"><a href="/bbs/moj/184/${100+i}/artclView.do">${t}<span>새글작성</span></a></td><td aria-label="작성일">2026.08.24</td></tr>`).join('');
  const r=parseCentralBoard(body,config);assert.equal(r.parsedRows,4);assert.equal(r.items.length,1);
  assert.equal(r.items[0].title,titles[0]);assert.equal(r.items[0].announcedFrom,'2026-08-24');assert.equal(r.items[0].applicationTo,null);
  assert.throws(()=>parseCentralBoard(body.replaceAll('/moj/184/','/moj/185/'),config));
  assert.throws(()=>parseCentralBoard(body.replaceAll('href="/bbs/','href="https://example.com/bbs/'),config));
  assert.throws(()=>parseCentralBoard(body.replaceAll(' title="',' data-label="'),config));
});
test('MOF distinguishes project plans from selection results and personnel notices',()=>{
  const config=centralCollectors.find(x=>x.id==='mof-board')!;
  const titles=['사업 신규과제 선정계획 재공고','사업대상지 추가 선정 연장 공고','지원사업 선정결과','설치준비위원회 모집','고객만족도 조사 사업자 선정 공고','채용 모집 공고'];
  const body=titles.map((title,i)=>`<tr><td class="tit"><a onclick="fn_selectDoc('${100+i}')" title="[게시글 바로가기] ${title}">${title}</a></td><td class="t-date">2026.09.02.</td></tr>`).join('');
  const r=parseCentralBoard(body,config);assert.equal(r.parsedRows,6);assert.deepEqual(r.items.map(x=>x.title),titles.slice(0,2));
  assert.equal(r.items[0].sourceUrl,'https://www.mof.go.kr/doc/ko/selectDoc.do?docSeq=100&menuSeq=375&bbsSeq=9');
  assert.equal(r.items[0].announcedFrom,'2026-09-02');assert.equal(r.items[0].applicationTo,null);
  assert.throws(()=>parseCentralBoard(body.replace("fn_selectDoc('100')","fn_selectDoc('invalid')"),config));
  assert.throws(()=>parseCentralBoard(body.replaceAll('[게시글 바로가기]','changed'),config));
});
test('MOLIT resolves relative links and decodes numeric Korean entities',()=>{
  const config=centralCollectors.find(x=>x.id==='molit-board')!;
  const body='<table>'+['수탁기관 &#44277;&#47784;','채용 모집','지원사업 선정 결과'].map((t,i)=>`<tr><td class="bd_title"><a href="./DTL.jsp?id=N01_B&amp;mode=view&amp;idx=${i+1}">${t}</a></td><td class='bd_date'>2026-09-01</td></tr>`).join('')+'</table>';
  const r=parseCentralBoard(body,config);assert.equal(r.items.length,1);assert.equal(r.items[0].title,'수탁기관 공모');assert.equal(r.items[0].announcedFrom,'2026-09-01');
  assert.throws(()=>parseCentralBoard(body.replaceAll('N01_B','other'),config));
});
test('MOEL reads two official board formats and excludes award decisions',()=>{
  for(const id of ['moel-board','moel-support']){
    const config=centralCollectors.find(x=>x.id===id)!;
    const path=id==='moel-board'?'/news/notice/noticeView.do':'/info/govsupport/govsupportcon/govSupportSubView.do';
    const body='<table>'+['[공고] 청년지원 사업 참여 지자체 공모','[공고] 해소사업 추가 공모 우선협상 대상자 선정 공고','[인사] 공모 직위 공개모집'].map((t,i)=>`<tr><td class="txt_left" aria-label="제목"><strong><a href="${path}?bbs_seq=${20260100001+i}">${t}</a></strong></td><td aria-label="등록일">2026.01.15</td></tr>`).join('')+'</table>';
    const r=parseCentralBoard(body,config);assert.equal(r.items.length,1);assert.equal(r.items[0].title,'청년지원 사업 참여 지자체 공모');assert.equal(r.items[0].announcedFrom,'2026-01-15');assert.equal(r.items[0].applicationFrom,null);
    assert.throws(()=>parseCentralBoard(body.replaceAll(path,'/wrong.do'),config));
  }
});
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
test('Unikorea validates official board and Korean-offset dates without inventing reception',()=>{
  const config=centralCollectors.find(x=>x.id==='unikorea-board')!;
  const body='<rss><channel>'+['콘텐츠 공모전 개최','신진연구자 정책연구과제 공모 최종 선정과제 공고','연구용역 제안서 공모'].map((t,i)=>`<item><title>${t}</title><link>https://unikorea.go.kr/web/unikorea/bbs/bbs_0000000000000001/${59506+i}</link><pubDate>Thu, 06 Aug 2026 00:32:50 +0900</pubDate></item>`).join('')+'</channel></rss>';
  const r=parseCentralBoard(body,config);assert.equal(r.parsedRows,3);assert.equal(r.items.length,1);assert.equal(r.items[0].externalId,'59506');assert.equal(r.items[0].announcedFrom,'2026-08-06');assert.equal(r.items[0].applicationFrom,null);
  assert.equal(parseCentralBoard(body.replaceAll('06 Aug','30 Feb'),config).items[0].announcedFrom,null);
  assert.throws(()=>parseCentralBoard(body.replaceAll('bbs_0000000000000001/','bbs_0000000000000004/'),config));
  assert.throws(()=>parseCentralBoard(body.replaceAll('https://unikorea.go.kr/','https://example.com/'),config));
  assert.equal(parseCentralBoard(body.replace('콘텐츠 공모전 개최','공무원 채용 모집'),config).items.length,0);
});
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
