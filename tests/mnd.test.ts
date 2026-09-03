import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {centralCollectors,parseCentralBoard} from '../lib/central-collectors.ts';
test('MND canonicalizes official prefixed IDs and separates notices from military recruitment',()=>{
  const c=centralCollectors.find(x=>x.id==='mnd-board')!;
  const titles=['2026년 국방AI 경진대회 개최 안내','군 인권 홍보 콘텐츠 공모전 안내','직장어린이집 위탁운영자 모집 공고','국방 청렴문학상 공모 안내','상비예비군 수시모집 및 선발 공고','비상임감사 공개모집','교육 참가자 모집 안내','통합지원사업(하나금융그룹 후원) 안내','입찰 공고','공모전 결과'];
  const body='<rss><channel>'+titles.map((t,i)=>`<item><title><![CDATA[${t}}]]></title><link>/bbs/mnd/11066/I_${14082710+i}/artclView.do?layout=unknown</link><pubDate>2026-08-31 19:52:24.0</pubDate></item>`).join('')+'</channel></rss>';
  const r=parseCentralBoard(body,c);assert.equal(r.parsedRows,10);assert.equal(r.items.length,4);assert.equal(r.items[0].title,titles[0]);assert.equal(r.items[0].externalId,'14082710');
  assert.equal(r.items[0].sourceUrl,'https://www.mnd.go.kr/bbs/mnd/11066/I_14082710/artclView.do');assert.equal(r.items[0].announcedFrom,'2026-08-31');assert.equal(r.items[0].applicationFrom,null);assert.equal(r.items[0].closesAt,null);
  for(const bad of [body.replaceAll('11066','11067'),body.replaceAll('/I_','/X_'),body.replaceAll('/bbs/mnd/','https://example.com/bbs/mnd/'),'<html>접근 오류</html>'])assert.throws(()=>parseCentralBoard(bad,c));
});
