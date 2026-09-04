import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Native Node test runner uses explicit extensions.
import {parseSocialenterpriseBoard,fetchSocialenterpriseList} from '../lib/socialenterprise-collector.ts';
function row(id='123',title='멘토링 지원사업 참여기업 모집'){
  return {B_IDX:id,BS_IDX:'10002',BC_IDX:'10002',DEL_YN:'N',CATEGORY_NAME:'사업공고',SUBJECT:title,WRITE_DATE:'2026/09/03',ENDSDATE:'0',ENDEDATE:'99991231',IP_ADDR:'not-for-storage'};
}
function fixture(rows=[row()],pinned:unknown[]=[]){return {resultCode:'0',noticeList:pinned,resultList:rows,paginationInfo:{currentPageNo:1,recordCountPerPage:10,firstRecordIndex:0,totalRecordCount:rows.length,totalPageCount:Math.ceil(rows.length/10)}};}
const parse=(data:unknown)=>parseSocialenterpriseBoard(JSON.stringify(data));
test('socialenterprise stores candidate-only dates and explicitly selected fields',()=>{
  const [item]=parse(fixture([row('123','참여기업 모집(~9/14)')])).items;
  assert.equal(item.status,'unknown');assert.equal(item.applicationTo,null);assert.equal(item.closesAt,null);
  assert.equal(item.announcedFrom,'2026-09-03');assert.equal(item.externalId,'123');
  assert.ok(!JSON.stringify(item).includes('not-for-storage'));assert.ok(!JSON.stringify(item).includes('99991231'));
});
test('socialenterprise rejects structural drift and invalid dates',()=>{
  for(const field of [{resultCode:0},{resultCode:'1'},{resultList:null},{paginationInfo:{}}])assert.throws(()=>parse({...fixture(),...field}));
  for(const field of [{B_IDX:'1&x=2'},{BS_IDX:'999'},{BC_IDX:'0'},{DEL_YN:'Y'},{WRITE_DATE:'2026/02/30'},{CATEGORY_NAME:'선정결과'},{SUBJECT:''}])assert.throws(()=>parse(fixture([{...row(),...field}])));
});
test('socialenterprise handles pinned duplicates but rejects conflicts',()=>{
  const {CATEGORY_NAME,...pinned}=row();
  assert.equal(parse(fixture([row()],[{...pinned,CATEGORYNAME:CATEGORY_NAME}])).items.length,1);
  assert.throws(()=>parse(fixture([row()],[{...row(),SUBJECT:'다른 지원사업 모집'}])));
});
test('socialenterprise excludes non-grants but retains enterprise participation opportunities',()=>{
  for(const title of ['직원 채용 모집','지원사업 선정결과','지원사업 입찰 공고','SVI 측정기업 모집','경영공시 교육 참여 모집','설립인가교육 모집'])assert.equal(parse(fixture([row('123',title)])).items.length,0,title);
  for(const title of ['공공구매 상담회 참가기업 모집','공공시장 진출 교육 참여대상 모집','사무공간 상주기업 모집','사회적가치 비즈니스 모델 공모전'])assert.equal(parse(fixture([row('123',title)])).items.length,1,title);
});
test('socialenterprise fetch is fixed to public first-page business category',async()=>{
  const mock=(async(url:RequestInfo|URL,init?:RequestInit)=>{
    assert.equal(String(url),'https://www.socialenterprise.or.kr/homepage/bbs/ajax/boardList.do');assert.equal(init?.method,'POST');assert.equal(init?.redirect,'manual');
    const body=new URLSearchParams(String(init?.body));assert.equal(body.get('bcIdx'),'10002');assert.equal(body.get('page'),'1');
    return new Response('{}');
  }) as typeof fetch;
  await fetchSocialenterpriseList(mock);
});
