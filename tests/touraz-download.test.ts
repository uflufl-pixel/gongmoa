import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Native Node test runner uses explicit extensions.
import {parseCsvRows,previewTourazCsv,fetchTourazCsv,handleTourazPreview} from '../lib/touraz-download.ts';
const header='상태,기관명,제목,신청기간,담당부서,등록일,링크';
const row=(id='1709',title='2027 무장애 관광환경 조성 사업 공모 실시')=>`대기,한국관광공사,${title},2026-09-07 ~ 2026-09-30,열린관광콘텐츠팀,2026-08-31,https://touraz.kr/announcementList/pssrpView?pssrpSeq=${id}`;
const csv=(...rows:string[])=>'\uFEFF'+header+'\r\n'+rows.join('\r\n')+'\r\n';
test('공식 7열 계약과 숫자 ID, 날짜 정밀도 보존',()=>{
 const r=previewTourazCsv(csv(row()));assert.equal(r.parsedRows,1);assert.equal(r.items[0].externalId,'1709');assert.equal(r.items[0].closesAt,null);assert.equal(r.items[0].verification,'candidate');assert.equal(r.stored,0);assert.equal(r.verified,0);
});
test('quoted 쉼표, 줄바꿈, 이중 따옴표 처리',()=>{assert.deepEqual(parseCsvRows('a,"b,c","d\n""e"""\r\n'),[['a','b,c','d\n"e"']]);});
test('빈 파일/헤더 변경/잘못된 따옴표 거절',()=>{for(const s of ['',header,csv(row()).replace('기관명','기관'),csv(row()).replace('2027','"2027')])assert.throws(()=>previewTourazCsv(s));});
test('행 순서와 재처리가 식별자를 바꾸지 않음, 중복 제거',()=>{
 const a=previewTourazCsv(csv(row(),row('1700','데이터 활용 경진대회'))),b=previewTourazCsv(csv(row('1700','데이터 활용 경진대회'),row()));assert.deepEqual(a.items.map(i=>i.externalId).sort(),b.items.map(i=>i.externalId).sort());assert.deepEqual(a,previewTourazCsv(csv(row(),row('1700','데이터 활용 경진대회'))));assert.equal(previewTourazCsv(csv(row(),row())).duplicates,1);assert.throws(()=>previewTourazCsv(csv(row(),row('1709','변경 모집'))),/상충/);
});
test('잘못된 날짜·외부 URL 격리, 이벤트·인턴 제외',()=>{
 const r=previewTourazCsv(csv(row(),row('1710').replace('2026-09-30','2026-02-30'),row('1711').replace('touraz.kr','evil.test'),row('1712','공모전 온라인 참여 심사 이벤트'),row('1713','인턴십 지원사업 참여기업 모집')));assert.equal(r.rejected.length,2);assert.equal(r.candidateRows,1);
});
test('휴가지원사업은 근로자라는 단어만으로 채용으로 제외하지 않음',()=>{assert.equal(previewTourazCsv(csv(row('1448','2026 근로자 휴가지원사업 참여기업 확대 모집'))).candidateRows,1);});
test('공식 POST 파라미터 사용 및 정상 CSV',async()=>{
 const fake:typeof fetch=async (url,init)=>{assert.match(String(url),/^https:\/\/touraz.kr\//);assert.equal(init?.method,'POST');assert.equal(init?.redirect,'manual');assert.equal((init?.body as URLSearchParams).get('isComsubmit'),'1');return new Response(csv(row()),{headers:{'content-type':'text/csv;charset=UTF-8'}});};assert.equal(await fetchTourazCsv(fake),csv(row()).replace(/^\uFEFF/,''));
});
test('빈 응답·로그인 HTML·리다이렉트·용량 초과 거절',async()=>{
 for(const response of [new Response('',{headers:{'content-type':'text/csv'}}),new Response('<html>login</html>'),new Response(null,{status:302}),new Response('x'.repeat(2_000_001),{headers:{'content-type':'text/csv'}})])await assert.rejects(fetchTourazCsv(async()=>response));
});
test('preview는 고정 경로만 사용하며 쓰기 없이 오류 반환',async()=>{
 let calls=0;const fake:typeof fetch=async()=>{calls++;return new Response('',{headers:{'content-type':'text/csv'}});};const bad=await handleTourazPreview(new Request('https://local/api/touraz-preview?url=evil',{method:'POST'}),fake);assert.equal(bad.status,400);assert.equal(calls,0);const r=await handleTourazPreview(new Request('https://local/api/touraz-preview',{method:'POST'}),fake);assert.equal(r.status,502);assert.equal((await r.json() as {stored:number}).stored,0);
});
