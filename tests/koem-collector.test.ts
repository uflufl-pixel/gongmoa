import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Native Node test runner uses explicit extensions.
import {parseKoemBoard} from '../lib/koem-collector.ts';

const row=(id:string,title:string,date='2026.08.18')=>`<tr><td class="title"><a href="/site/koem/ex/board/View.do?cbIdx=236.0&amp;bcIdx=${id}.0" onclick="doBbsContentFView(${id}.0);return false;">${title}</a></td><td>${date}</td><td>10</td></tr>`;
const page=(rows:string[])=>`<html><body><span>등록일</span><script>doBbsContentFView</script><table>${rows.join('')}</table></body></html>`;

test('KOEM emits only the audited active support call with canonical identity',()=>{
  const parsed=parseKoemBoard(page([
    row('36227','2026년 하반기 온실가스 국제감축사업(설치 지원사업) 공고'),
    row('36216','2026 해양폐기물 자원순환 대국민 공모전'),
    row('35808','국민소통참여단 모집'),
    row('36000','직원 채용 공고'),
    row('36001','용역 입찰 공고'),
  ]));
  assert.equal(parsed.parsedRows,5);
  assert.equal(parsed.items.length,1);
  assert.equal(parsed.items[0].externalId,'36227');
  assert.equal(parsed.items[0].ministry,'해양수산부');
  assert.equal(parsed.items[0].sourceUrl,'https://www.koem.or.kr/site/koem/ex/board/View.do?bcIdx=36227&cbIdx=236');
  assert.equal(parsed.items[0].applicationTo,'2026-09-11 17:00');
});

test('KOEM fails closed on wrong board, duplicate identity, and structural drift',()=>{
  assert.throws(()=>parseKoemBoard('<table><tr><td>등록일</td></tr></table>'));
  const duplicate=row('36227','2026년 하반기 온실가스 국제감축사업(설치 지원사업) 공고');
  assert.throws(()=>parseKoemBoard(page([duplicate,duplicate,row('1','공모'),row('2','공모'),row('3','공모')])));
});
