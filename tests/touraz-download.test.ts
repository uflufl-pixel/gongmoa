import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Native Node test runner uses explicit extensions.
import {parseCsvRows,previewTourazCsv,fetchTourazCsv,handleTourazPreview,tourazReception,tourazCandidate,collectTourazKto} from '../lib/touraz-download.ts';
// @ts-ignore Native Node test runner.
import {receptionState} from '../lib/notice-search.ts';
const header='상태,기관명,제목,신청기간,담당부서,등록일,링크';
const row=(id='1709',title='2027 무장애 관광환경 조성 사업 공모 실시')=>`대기,한국관광공사,${title},2026-09-07 ~ 2026-09-30,열린관광콘텐츠팀,2026-08-31,https://touraz.kr/announcementList/pssrpView?pssrpSeq=${id}`;
const csv=(...rows:string[])=>'\uFEFF'+header+'\r\n'+rows.join('\r\n')+'\r\n';
test('승인한 실제 발행기관만 연결하고 기존 마감공고는 계속 추적',()=>{
 const input=csv(row(),row('1710').replace('한국관광공사','울산문화관광재단'),row('1713').replace('한국관광공사','울산광역시'),row('1711').replace('대기','종료'),row('1712','공모전 심사 이벤트'));
 const now=new Date('2026-09-04T00:00:00Z');
 const first=collectTourazKto(input,[],now);assert.deepEqual(first.items.map(i=>i.externalId),['1709','1710']);
 assert.equal(first.items[1].institution,'울산문화관광재단');assert.equal(first.items[1].region,'울산광역시');assert.equal(first.items[1].ministry,null);assert.match(first.items[1].sourceName,/울산문화관광재단/);
 const r=collectTourazKto(input,['1711'],now);assert.equal(r.items.length,3);assert.equal(r.items[2].status,'closed');assert.equal(r.items[0].closesAt,null);
 assert.equal(receptionState({sourceReceptionState:'대기',applicationFrom:'2026-09-07',applicationTo:'2026-09-30',deadlinePrecision:'date'},'2026-09-08'),'unknown');
 assert.throws(()=>collectTourazKto(csv(row().replace('2026-09-30','2026-02-30'))));
});
test('공식 7열 계약과 숫자 ID, 날짜 정밀도 보존',()=>{
 const r=previewTourazCsv(csv(row()));assert.equal(r.parsedRows,1);assert.equal(r.items[0].externalId,'1709');assert.equal(r.items[0].closesAt,null);assert.equal(r.items[0].verification,'candidate');assert.equal(r.stored,0);assert.equal(r.verified,0);
});
test('quoted 쉼표, 줄바꿈, 이중 따옴표 처리',()=>{assert.deepEqual(parseCsvRows('a,"b,c","d\n""e"""\r\n'),[['a','b,c','d\n"e"']]);});
test('빈 파일/헤더 변경/잘못된 따옴표 거절',()=>{for(const s of ['',header,csv(row()).replace('기관명','기관'),csv(row()).replace('2027','"2027')])assert.throws(()=>previewTourazCsv(s));});
test('행 순서와 재처리가 식별자를 바꾸지 않음, 중복 제거',()=>{
 const a=previewTourazCsv(csv(row(),row('1700','데이터 활용 경진대회'))),b=previewTourazCsv(csv(row('1700','데이터 활용 경진대회'),row()));assert.deepEqual(a.items.map(i=>i.externalId).sort(),b.items.map(i=>i.externalId).sort());assert.deepEqual(a,previewTourazCsv(csv(row(),row('1700','데이터 활용 경진대회'))));assert.equal(previewTourazCsv(csv(row(),row())).duplicates,1);assert.throws(()=>previewTourazCsv(csv(row(),row('1709','변경 모집'))),/상충/);
});
test('잘못된 날짜·외부 URL 격리, 이벤트·인턴 제외',()=>{
 const r=previewTourazCsv(csv(row(),row('1710').replace('2026-09-30','2026-02-30'),row('1711').replace('touraz.kr','evil.test'),row('1712','공모전 온라인 참여 심사 이벤트'),row('1713','청년 인턴 모집')));assert.equal(r.rejected.length,2);assert.equal(r.candidateRows,1);
});
test('인턴 개인모집과 기업 지원사업을 구분하되 채용·결과 예외는 없음',()=>{
 assert.equal(tourazCandidate('2026 울산 관광 인재 인턴십 지원사업 참여기업 모집'),true);
 assert.equal(tourazCandidate('인턴십 지원사업 참여기업 공모'),true);
 for(const title of ['인턴 모집','인턴십 지원사업 참여자 모집','인턴십 지원사업 참여기업 모집 결과','인턴십 지원사업 참여기업 채용 모집'])assert.equal(tourazCandidate(title),false);
});
test('원문 접수 상태와 날짜 계산을 분리하며 KST 마감일에 시각을 만들지 않음',()=>{
 const state=(s:string,t:string)=>tourazReception(s,'2026-09-07','2026-09-30',new Date(t));
 assert.equal(state('접수','2026-09-06T14:59:59Z'),'upcoming');
 assert.equal(state('접수','2026-09-06T15:00:00Z'),'open');
 assert.equal(state('접수','2026-09-29T14:59:59Z'),'open');
 assert.equal(state('접수','2026-09-29T15:00:00Z'),'unknown');
 assert.equal(state('접수','2026-09-30T15:00:00Z'),'closed');
 assert.equal(state('종료','2026-09-08T00:00:00Z'),'closed');
 assert.equal(state('대기','2026-09-08T00:00:00Z'),'unknown');
 assert.equal(tourazReception('접수','invalid','2026-09-30'),'unknown');
 const r=previewTourazCsv(csv(row()),new Date('2026-09-04T00:00:00Z'));assert.equal(r.items[0].sourceState,'대기');assert.equal(r.items[0].receptionState,'upcoming');assert.equal(r.items[0].closesAt,null);
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
