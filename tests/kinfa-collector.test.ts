import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Native Node test runner uses explicit extensions.
import {fetchKinfaList,kinfaCandidate,parseKinfaBoard} from '../lib/kinfa-collector.ts';
const row=(id:string,title:string,date='2026-09-01',notice='Y')=>`<li class="item type02" data-noticeYn="${notice}" data-rowNo="1" data-seqBoardGeneral="${id}" data-boardCode="00018" data-boardDetailCode="00027"><p class="tit">${title}</p><p class="date">${date}</p><p class="date">3회</p></li>`;
const wrap=(body:string)=>`<div>${'x'.repeat(5000)} 전체 선택됨 일반공고 선택됨 입찰공고 선택됨 ${body}</div>`;
const ten=(first:string)=>wrap(first+Array.from({length:9},(_,i)=>row(String(40000+i),'센터이전 안내')).join(''));
test('KINFA keeps support recruitment but excludes notices, procurement and general contests',()=>{
  for(const title of ['자영업자 상생지원 홍보사업 인정가게 모집공고','영세자영업자 컨설팅 지원 프로그램 신청'])assert.equal(kinfaCandidate(title),true,title);
  for(const title of ['직원 채용','플랫폼 구축 감리 용역','SNS 인증 이벤트','서비스 명칭 공모전','정부포상 후보자 공개검증'])assert.equal(kinfaCandidate(title),false,title);
});
test('KINFA validates official row identity, deduplicates pins and preserves unknown reception',()=>{
  const html=wrap(row('40010','자영업자 컨설팅 지원사업 모집','2026-09-01','X')+row('40010','자영업자 컨설팅 지원사업 모집')+Array.from({length:9},(_,i)=>row(String(40100+i),'센터이전 안내')).join(''));
  const parsed=parseKinfaBoard(html);assert.equal(parsed.parsedRows,11);assert.equal(parsed.pinned,1);assert.equal(parsed.items.length,1);
  assert.deepEqual({id:parsed.items[0].externalId,status:parsed.items[0].status,from:parsed.items[0].applicationFrom,to:parsed.items[0].applicationTo}, {id:'40010',status:'unknown',from:null,to:null});
  assert.ok(parsed.items[0].sourceUrl.endsWith('seq=40010'));
});
test('KINFA pinned marker does not create a false duplicate conflict',()=>{
  const pinned=row('40010','<em>[공지]</em> 자영업자 컨설팅 지원사업 모집','2026-09-01','X');
  const parsed=parseKinfaBoard(wrap(pinned+row('40010','자영업자 컨설팅 지원사업 모집')+Array.from({length:9},(_,i)=>row(String(40200+i),'센터이전 안내')).join('')));
  assert.equal(parsed.items[0].title,'자영업자 컨설팅 지원사업 모집');
});
test('KINFA does not newly import reviewed closed recognition-store round',()=>{
  const html=ten(row('34895','자영업자 상생지원 홍보사업 인정가게 모집공고','2026-07-01'));
  assert.equal(parseKinfaBoard(html).items.length,0);
  const known=parseKinfaBoard(html,['34895']);assert.equal(known.items[0].status,'closed');assert.equal(known.excludedClosed,1);
});
test('KINFA rejects malformed identity, dates, conflicting duplicates and short error pages',()=>{
  for(const html of ['login',ten(row('x','지원사업 모집')),ten(row('40010','지원사업 모집','2026-02-30')),wrap(row('40010','지원사업 모집')+row('40010','다른 지원사업 모집')+Array.from({length:8},(_,i)=>row(String(40100+i),'안내')).join(''))])assert.throws(()=>parseKinfaBoard(html));
});
test('KINFA fetch is a fixed public request without redirects',async()=>{
  await fetchKinfaList((async(url,init)=>{assert.equal(String(url),'https://www.kinfa.or.kr/notificationPromotion/notice.do');assert.equal(init?.redirect,'manual');return new Response('');}) as typeof fetch);
});
