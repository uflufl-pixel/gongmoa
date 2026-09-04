import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Native Node test runner uses explicit extensions.
import {parseArkoBoard,fetchArkoList,arkoCandidate} from '../lib/arko-collector.ts';
function row(id='CRL3578',state='진행중',title='공연예술대관료지원 공모',date='2026.09.02 ~ 2026.09.16'){
  return `<li><a href="https://artnuri.or.kr/crawler/info/view.do?docid=${id}&amp;source=한국문화예술위원회"><span class="state ${state==='종료'?'gray':''}">${state}</span><span class="tit">${title}</span><span class="date">${date}</span></a></li>`;
}
const list=(rows:string)=>`<ul class="cardBdList"></ul><ul class="cardBdList">${rows}</ul>`;
test('ARKO date conflict is not converted to a fabricated application deadline',()=>{
  const [i]=parseArkoBoard(list(row())).items;assert.equal(i.externalId,'CRL3578');assert.equal(i.status,'unknown');assert.equal(i.applicationTo,null);assert.equal(i.opensAt,null);assert.equal(i.closesAt,null);
});
test('ARKO closed items tracked only if already known',()=>{
  const html=list(row('CRL3578','종료'));assert.equal(parseArkoBoard(html).items.length,0);assert.equal(parseArkoBoard(html,['CRL3578']).items[0].status,'closed');
});
test('ARKO retains status changes of known IDs even after non-candidate retitling',()=>{
  const [item]=parseArkoBoard(list(row('CRL3578','종료','공연예술 지원사업 선정결과')),['CRL3578']).items;
  assert.equal(item.status,'closed');assert.equal(arkoCandidate(item.title),false);
});
test('ARKO stable ID deduplicates matching rows, conflicting rows fail',()=>{
  assert.equal(parseArkoBoard(list(row()+row())).items.length,1);
  assert.throws(()=>parseArkoBoard(list(row()+row('CRL3578','진행중','공연예술대관료지원 공모','2026.09.02 ~ 2026.09.15'))));
});
test('ARKO validates identity, state, date and structural contract',()=>{
  for(const html of ['<html>login</html>',list(row().replace('https://artnuri.or.kr','https://example.com')),list(row().replace('source=한국문화예술위원회','source=타기관')),list(row('CRL3578','알수없음')),list(row('CRL3578','진행중','공모','2026.02.30 ~ 2026.09.15')),list(row('CRL3578&docid=CRL1'))])assert.throws(()=>parseArkoBoard(html));
});
test('ARKO retains residency support but excludes recruitment and results',()=>{
  assert.equal(parseArkoBoard(list(row('CRL3577','진행중','2027년 해외레지던시및프로그램참가지원(칠레)'))).items.length,1);
  for(const title of ['위원 모집','직원 채용 공고','지원사업 선정결과'])assert.equal(parseArkoBoard(list(row('CRL1','진행중',title))).items.length,0);
});
test('ARKO uses fixed official business list without following redirects',async()=>{
  await fetchArkoList((async(url,init)=>{assert.equal(String(url),'https://arko.or.kr/board/list/4013?bid=463&sf_icon_category=cw00000019');assert.equal(init?.redirect,'manual');return new Response('');}) as typeof fetch);
});
