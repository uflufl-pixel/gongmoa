import test from 'node:test';import assert from 'node:assert/strict';
// @ts-expect-error Native Node tests use explicit extensions.
import {collectFiraBundle} from '../lib/fira-collector.ts';
const html='한국수산자원공단 공고 제2026-06호 어선청년임대사업 임대용어선 모집공고 상시모집 전국 연안복합·연안통발·연안자망 어선 월 임차료의 70% shipNotice2602.pdf';
const bundle=()=>JSON.stringify({html,pdfBytes:224731,pdfMagic:'%PDF-1.4',pdfEnd:'%%EOF\n',pdfHash:'150c414a0b557e1dbb41e4ccf43569f4558f5d88559132e7b35157e1ee88c1a9'});
test('FIRA imports the standing vessel-owner opportunity conservatively',()=>{const r=collectFiraBundle(bundle());assert.equal(r.items.length,1);assert.equal(r.items[0].externalId,'2026-06');assert.equal(r.items[0].status,'open');assert.equal(r.items[0].closesAt,null);assert.equal(r.items[0].supportBudget,null);});
test('FIRA keeps the participant scope and application channel',()=>{const i=collectFiraBundle(bundle()).items[0];assert.match(i.audience,/어선/);assert.match(i.applicationMethod,/우편 또는 팩스/);assert.match(i.applicationMethod,/70%/);});
test('FIRA fails closed on page identity or attachment drift',()=>{assert.throws(()=>collectFiraBundle(bundle().replace('상시모집','기간모집')));assert.throws(()=>collectFiraBundle(bundle().replace('224731','224732')));assert.throws(()=>collectFiraBundle(bundle().replace('150c414a','250c414a')));});
test('FIRA closes a known call and never newly imports one after an explicit stop notice',()=>{const stopped=bundle().replace('shipNotice2602.pdf','모집 종료 shipNotice2602.pdf');assert.equal(collectFiraBundle(stopped).items.length,0);assert.equal(collectFiraBundle(stopped,['2026-06']).items[0].status,'closed');});
