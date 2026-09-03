import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node TypeScript runner.
import {fetchPoliceList,policeListUrl} from '../lib/police-fetch.ts';
// @ts-expect-error Native Node TypeScript runner.
import {centralCollectors,parseCentralBoard} from '../lib/central-collectors.ts';
test('Police same-URL session retry is bounded and shares its timeout',async()=>{
  let calls=0;let signal:AbortSignal|null|undefined;
  const mock:typeof fetch=async(url,init)=>{
    assert.equal(url,policeListUrl);assert.equal(init?.redirect,'manual');calls++;
    if(calls===1){signal=init?.signal;return new Response(null,{status:307,headers:{location:policeListUrl,'set-cookie':'TMOSHCooKie=issued123; Path=/; Secure'}});}
    assert.equal(init?.signal,signal);assert.equal(new Headers(init?.headers).get('cookie'),'TMOSHCooKie=issued123');return new Response('ok');
  };
  assert.equal((await fetchPoliceList(mock)).status,200);assert.equal(calls,2);
});
test('Police does not forward sessions across URLs or loop indefinitely',async()=>{
  for(const location of [policeListUrl,'https://example.com/','https://www.police.go.kr/other']){
    let calls=0;const mock:typeof fetch=async()=>{calls++;return new Response(null,{status:307,headers:{location,'set-cookie':'TMOSHCooKie=issued123'}});};
    assert.equal((await fetchPoliceList(mock)).status,307);assert.equal(calls,location===policeListUrl?2:1);
  }
  for(const status of [200,403,404,307]){
    let calls=0;await fetchPoliceList(async()=>{calls++;return new Response(null,{status,headers:{location:policeListUrl}});});assert.equal(calls,1);
  }
});
test('Police validates official 17-digit identities and excludes non-grants',()=>{
  const config=centralCollectors.find(c=>c.id==='police-board')!;
  const titles=['치안안전 지원사업 수행기관 공모','제49호 대테러연구 논문 모집 공고','경비지도사 국가자격시험 시행계획 공고','임용관계서류 제출 안내','시설운영 성과평가 결과 공지'];
  const body='<tbody>'+titles.map((t,i)=>`<tr><td class="subject"><a href="BD_selectBbs.do?q_bbsCode=1001&amp;q_bbscttSn=2026090113064005${i}&amp;page=1">${t}</a><img alt="New"></td><td>2026-09-01</td></tr>`).join('')+'</tbody>';
  const result=parseCentralBoard(body,config);assert.equal(result.parsedRows,5);assert.equal(result.items.length,1);
  assert.equal(result.items[0].externalId,'20260901130640050');assert.equal(result.items[0].announcedFrom,'2026-09-01');assert.equal(result.items[0].applicationFrom,null);
  assert.equal(result.items[0].sourceUrl,'https://www.police.go.kr/user/bbs/BD_selectBbs.do?q_bbsCode=1001&q_bbscttSn=20260901130640050');
  assert.equal(parseCentralBoard(body.replace(titles[0],'일반경비원 신임교육 기관 및 일정 공지'),config).items.length,0);
  for(const modified of [body.replaceAll('q_bbsCode=1001','q_bbsCode=1002'),body.replaceAll('2026090113064005','123'),body.replaceAll('BD_selectBbs.do?','https://example.com/user/bbs/BD_selectBbs.do?'),'<html>접근 제한</html>'])assert.throws(()=>parseCentralBoard(modified,config));
});
