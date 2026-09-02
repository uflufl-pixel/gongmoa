import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const registry=JSON.parse(readFileSync(new URL('../data/central-institutions.json',import.meta.url),'utf8')) as {items:Array<{id:string;code:string;name:string;type:string;scope:string}>};
test('official central registry contains 19 ministries, 6 offices, 18 agencies and 2 separate offices',()=>{
  const central=registry.items.filter(x=>x.scope==='중앙행정기관');
  assert.equal(central.length,43);
  for(const [type,count] of [['부',19],['처',6],['청',18]])assert.equal(central.filter(x=>x.type===type).length,count);
  assert.equal(registry.items.length,45);
  assert.equal(new Set(registry.items.map(x=>x.id)).size,45);
  assert.equal(new Set(registry.items.map(x=>x.code)).size,45);
  assert.equal(new Set(registry.items.map(x=>x.name)).size,45);
});
test('existing institution source links retain their IDs; abolished names are not added',()=>{
  for(const [name,id] of [['교육부','moe'],['문화체육관광부','mcst'],['행정안전부','mois'],['기후에너지환경부','me'],['중소벤처기업부','mss'],['과학기술정보통신부','msit']])assert.equal(registry.items.find(x=>x.name===name)?.id,id);
  assert.ok(!registry.items.some(x=>['기획재정부','통계청','특허청'].includes(x.name)));
});
