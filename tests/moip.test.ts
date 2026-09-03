import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {centralCollectors,parseCentralBoard} from '../lib/central-collectors.ts';
test('MOIP preserves missing dates, validates official board and excludes education recruitment',()=>{
  const c=centralCollectors.find(x=>x.id==='moip-board')!;
  const titles=['startup OI 지역실증 피칭 스타트업 모집','K-브랜드 보호를 위한 숏폼 공모전 안내','2026년 지식재산서비스 성장지원사업 수행기관 모집 안내','IP산업 활성화를 위한 AI활용 지원 교육 운영계획 및 모집 안내','중소기업 부설연구소 지식재산 맞춤형 교육 5차 과정 운영계획 및 모집안내','채용 모집 공고','지원사업 선정 결과'];
  const body='<rss><channel>'+titles.map((t,i)=>`<item><title>${t}</title><link>/ko/kpoBultnDetail.do?menuCd=SCD0200609&amp;ntatcSeq=${19705+i}&amp;aprchId=BUT0000020&amp;sysCd=SCD02&amp;page=2</link><description>2026년 행사 안내</description></item>`).join('')+'</channel></rss>';
  const r=parseCentralBoard(body,c);assert.equal(r.parsedRows,7);assert.equal(r.items.length,3);
  assert.equal(r.items[0].externalId,'19705');assert.equal(r.items[0].announcedFrom,null);assert.equal(r.items[0].applicationFrom,null);assert.equal(r.items[0].closesAt,null);
  assert.equal(r.items[0].sourceUrl,'https://www.moip.go.kr/ko/kpoBultnDetail.do?menuCd=SCD0200609&ntatcSeq=19705&aprchId=BUT0000020&sysCd=SCD02');
  for(const bad of [body.replaceAll('SCD0200609','SCD0200618'),body.replaceAll('BUT0000020','OTHER'),body.replaceAll('ntatcSeq=19705','ntatcSeq=abc'),body.replaceAll('/ko/kpoBultnDetail.do','https://example.com/ko/kpoBultnDetail.do'),'<html>오류</html>'])assert.throws(()=>parseCentralBoard(bad,c));
});
