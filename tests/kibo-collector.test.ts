import test from 'node:test';import assert from 'node:assert/strict';
// @ts-expect-error Native Node tests use explicit extensions.
import {collectKiboBundle,fetchKiboBundle} from '../lib/kibo-collector.ts';
const list=(id:string)=>`<a href="?articleNo=${id}"></a> 총 게시물 1 건 기업승계 M&amp;A 활성화를 위한 2026년도 컨설팅 지원사업 시행계획 공고 2026-08-01 ~ 2026-12-31 2026-08-04 공모중`;
const info='기초컨설팅 종합컨설팅 100개사 70만원 40개사 700만원 예산 소진';
const venture='상시모집 매달 20일 매달 말일 벤처기업 창업 7년 이내 기술평가등급 BB등급 이상 디지털지점';
const bundle=()=>JSON.stringify({foundation:list('1898'),overall:list('1901'),info,venture});
test('KIBO models two tracks as one opportunity and preserves rolling uncertainty',()=>{const r=collectKiboBundle(bundle());assert.equal(r.items.length,2);assert.equal(r.items[0].externalId,'mna-consulting-2026');assert.equal(r.items[0].status,'unknown');assert.equal(r.items[0].closesAt,null);assert.match(r.items[0].deadlineLabel,/예산 소진/);assert.equal(r.items[1].externalId,'venture-nara-2026');assert.match(r.items[1].deadlineLabel,/매월 20일/);});
test('KIBO rejects identity and evidence drift',()=>{assert.throws(()=>collectKiboBundle(bundle().replace('1898','1848')));assert.throws(()=>collectKiboBundle(bundle().replace('700만원','800만원')));assert.throws(()=>collectKiboBundle(bundle().replace('BB등급 이상','B등급 이상')));});
test('KIBO fetches only four fixed public pages without redirects',async()=>{const calls:Array<[string,RequestInit|undefined]>=[];const bodies=[list('1898'),list('1901'),info,venture];const mock=(async(u,i)=>{calls.push([String(u),i]);return new Response(bodies[calls.length-1]+' '.repeat(35_000));}) as typeof fetch;await fetchKiboBundle(mock);assert.equal(calls.length,4);for(const [,i] of calls)assert.equal(i?.redirect,'manual');});
