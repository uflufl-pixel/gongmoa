import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Native Node test runner uses explicit extensions.
import {parseKawfBoard,kawfCandidate,fetchKawfList,collectKawfBundle,fetchKawfBundle} from '../lib/kawf-collector.ts';
function row(id='19627',title='생활안정자금 융자 사업 안내',number='공지',date='26.08.18',url=''){
  return `<li role="row"><p role="cell" class="number">${number}</p><p role="cell" class="title Common_Bbs_Table_Type1_Item" data-pIdx="${id}" pUrl="${url}"><a href="#">${title}</a></p><p role="cell" class="date">${date}</p></li>`;
}
const wrap=(body:string)=>`<div class="board-list" role="table" aria-label="표 사업공고"><ul role="rowgroup">${body}</ul></div>`;
test('KAWF distinguishes loans and does not invent application dates',()=>{
  const [i]=parseKawfBoard(wrap(row())).items;assert.equal(i.category,'융자·금융지원(상환 필요)');assert.equal(i.status,'unknown');assert.equal(i.announcedFrom,'2026-08-18');assert.equal(i.applicationFrom,null);assert.equal(i.applicationTo,null);assert.equal(i.closesAt,null);assert.ok(i.sourceUrl.endsWith('selIdx=19627'));
});
test('KAWF recognizes ordinary rows and pinned rows separately',()=>{
  const p=parseKawfBoard(wrap(row()+row('19562','생활안정자금 융자 사업 안내','123')));assert.equal(p.pinned,1);assert.equal(p.parsedRows,2);assert.equal(p.items.length,2);
});
test('KAWF excludes follow-up noise and retains support opportunities',()=>{
  for(const t of ['심리상담 지원사업 접수 마감','보고서 제출','교부신청 대상자 교육 신청','지원사업 결과 발표','예술활동증명 제도 운영 안내','강사 모집'])assert.equal(kawfCandidate(t),false,t);
  for(const t of ['권리보호 교육 신청','예방 특강 신청','전자계약 서비스 지원','융자 사업 안내'])assert.equal(kawfCandidate(t),true,t);
});
test('KAWF updates existing closed/noise titles while keeping them hidden',()=>{
  const p=parseKawfBoard(wrap(row('19627','융자 사업 접수 마감')),['19627']);assert.equal(p.items[0].status,'closed');assert.equal(kawfCandidate(p.items[0].title),false);
});
test('KAWF rejects invalid dates, IDs and conflicting duplicates',()=>{
  for(const h of ['login',wrap(row('x')),wrap(row('19627','융자 안내','공지','26.02.30')),wrap(row()+row('19627','다른 융자 안내'))])assert.throws(()=>parseKawfBoard(h));
  assert.equal(parseKawfBoard(wrap(row()+row())).items.length,1);
});
test('KAWF does not attribute external redirects to this institution',()=>{
  const p=parseKawfBoard(wrap(row('1','융자 안내','공지','26.08.18','https://example.com')));assert.equal(p.items.length,0);assert.equal(p.external,1);
});
test('KAWF fetch uses fixed public endpoint without redirects',async()=>{
  await fetchKawfList((async(url,init)=>{assert.equal(String(url),'https://www.kawf.kr/notice/sub02.do');assert.equal(init?.redirect,'manual');return new Response('');}) as typeof fetch);
});
const detail=(title='전세자금 융자 사업 안내')=>`<h5 class="view-title">${title}</h5><input name="selIdx" value="19590"><div class="view-con">2026년 전세자금 융자 사업 대상: 예술활동증명을 완료한 예술인 접수 : 상시 방문 접수만 가능 사전 예약 예산 소진 시 조기 마감</div>`;
const bundle=(first:string,second:string,body:string|null=detail())=>JSON.stringify({first:wrap(first),second:wrap(second),detail:body});
test('KAWF page two only admits reviewed deposit-loan and does not duplicate older announcements',()=>{
  const p=collectKawfBundle(bundle(row(),row('19590','전세자금 융자 사업 안내','123')+row('19562')+row('19542')+row('19506')),[],new Date('2026-09-05'));
  assert.deepEqual(p.items.map(x=>x.externalId),['19627','19590']);assert.equal(p.deferred,1);assert.equal(p.excludedClosed,2);
  assert.equal(p.items[1].status,'unknown');assert.ok('applicationMethod' in p.items[1]);
});
test('KAWF closed and deferred IDs remain protected if moved to first page',()=>{
  const p=collectKawfBundle(bundle(row('19542')+row('19562'),row()),['19542']);assert.equal(p.items[0].status,'closed');assert.equal(p.items.length,1);
});
test('KAWF detail mismatch/missing evidence and cross-page conflicts fail before saving',()=>{
  for(const body of [null,detail('다른 공고'),detail().replace('상시','별도 안내'),detail().replace('value="19590"','value="123"')])assert.throws(()=>collectKawfBundle(bundle(row(),row('19590','전세자금 융자 사업 안내'),body)));
  assert.throws(()=>collectKawfBundle(bundle(row(),row('19627','다른 융자 안내'))));
});
test('KAWF does not newly admit the reviewed 2026 loan after its operating year',()=>{
  const p=collectKawfBundle(bundle(row(),row('19590','전세자금 융자 사업 안내')),[],new Date('2027-01-01'));assert.equal(p.items.length,1);assert.equal(p.deferred,1);
});
test('KAWF preserves explicit closure in known deposit-loan title or detail',()=>{
  for(const [title,body] of [['전세자금 융자 사업 안내 마감',detail('전세자금 융자 사업 안내 마감')],['전세자금 융자 사업 안내',detail().replace('접수 : 상시','접수 : 종료')]]){
    const p=collectKawfBundle(bundle(row(),row('19590',title),body),['19590'],new Date('2026-09-05'));
    assert.equal(p.items.find(x=>x.externalId==='19590')?.status,'closed');assert.equal(p.excludedClosed,1);
  }
});
test('KAWF bundle validates page navigation and requests only fixed public paths',async()=>{
  const calls:string[]=[];
  const mock=(async(url,init)=>{calls.push(String(url));assert.equal(init?.redirect,'manual');if(calls.length===1)return new Response(wrap(row())+'<a title=현재페이지>1</a>');if(calls.length===2){assert.equal(init?.method,'POST');assert.ok(String(init.body).includes('cpg=2'));return new Response(wrap(row('19590','전세자금 융자 사업 안내'))+'<a title=현재페이지>2</a>');}return new Response(detail());}) as typeof fetch;
  const result=await fetchKawfBundle(mock);assert.equal(calls.length,3);assert.ok(calls[2].endsWith('selIdx=19590'));assert.equal(collectKawfBundle(result,[],new Date('2026-09-05')).items.length,2);
  await assert.rejects(()=>fetchKawfBundle((async()=>new Response('login')) as typeof fetch));
});
