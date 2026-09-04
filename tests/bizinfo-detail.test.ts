import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Node native TypeScript runner requires explicit extension.
import {parseBizinfoDetail,mergeBizinfoDetail} from '../lib/bizinfo-detail.ts';
const html=(period:string)=>`<ul>${Object.entries({'소관부처·지자체':'인천광역시','사업수행기관':'인천테크노파크','신청기간':period,'사업개요':'<p>사업 소개</p><p>☞ 중소기업</p><p>☞ 기업당 2,300만원</p>','사업신청 방법':'온라인 접수'}).map(([k,v])=>`<li><span class="s_title">${k}</span><div class="txt">${v}</div></li>`).join('')}</ul>`;
const sites=(links:string)=>`<li><span class="s_title">사업신청 사이트</span><div class="txt">${links}</div></li>`;
test('preserves distinct labeled application links and decoded query/fragment',()=>{
  const a='https://pms.ripc.org/pms/biz/applicant/notice/info.do?a=1&b=2';
  const b='https://www.sbiz24.kr/#/pbanc/123';
  const d=parseBizinfoDetail(html('상시')+sites(`<a href='${a.replace('&','&amp;')}'>접수</a><a target='_blank' href="${b}">접수</a><a href='${b}'>중복</a>`));
  assert.deepEqual(d.applicationUrls,[a,b]);
});
test('rejects unsafe and unreviewed destinations and ignores unrelated links',()=>{
  const bad=['javascript:alert(1)','data:text/html,test','https://user:pass@www.sbiz24.kr/','https://www.sbiz24.kr.evil.test/','http://www.sbiz24.kr/','https://www.sbiz24.kr:8080/'];
  const valid='<a href="https://www.sbiz.or.kr/smst/index.do">접수</a>';
  const d=parseBizinfoDetail(html('상시')+sites(bad.map(u=>`<a href="${u}">접수</a>`).join(''))+valid+`<!--${sites(valid)}--><script>${sites(valid)}</script>`);
  assert.deepEqual(d.applicationUrls,[]);
});
test('extracts labeled facts, separates target from per-applicant funding',()=>{
  const d=parseBizinfoDetail(html('2026.09.01 ~ 2026.09.30'));
  assert.equal(d.institution,'인천테크노파크');assert.equal(d.ministry,'인천광역시');assert.equal(d.applicationFrom,'2026-09-01');assert.equal(d.applicationTo,'2026-09-30');assert.equal(d.audience,'중소기업');assert.ok(!('supportBudget' in d));
});
test('conditional periods remain text, unrelated suggested dates are ignored',()=>{
  const d=parseBizinfoDetail(html('모집 완료시까지')+'<div>2026.01.01 ~ 2026.12.31</div>');
  assert.equal(d.applicationFrom,null);assert.equal(d.applicationTo,null);assert.equal(d.applicationPeriod,'모집 완료시까지');
});
test('fails closed on missing labeled structure and impossible dates',()=>{
  assert.throws(()=>parseBizinfoDetail('<h1>접근 제한</h1>'));
  assert.throws(()=>parseBizinfoDetail(html('2026.02.30 ~ 2026.03.01')));
  assert.throws(()=>parseBizinfoDetail(html('2026-10-01 ~ 2026-09-01')));
});
test('merging detail overrides fresh list placeholders without modifying source object',()=>{
  const n={institution:'목록기관',audience:'기업·소상공인',status:'open',opensAt:null,closesAt:new Date('2026-09-30'),title:'원본 제목'};
  const d=parseBizinfoDetail(html('모집 완료시까지'));
  const merged=mergeBizinfoDetail(n,d,1788336000000);
  assert.equal(merged.institution,'인천테크노파크');assert.equal(merged.audience,'중소기업');assert.equal(merged.closesAt,null);assert.equal(n.institution,'목록기관');assert.equal(merged.title,n.title);
});
