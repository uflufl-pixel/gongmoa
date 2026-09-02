import fs from 'node:fs';

const [input,output]=process.argv.slice(2);
if(!input||!output) throw new Error('usage: node scripts/build-public-institutions.mjs INPUT_HTML OUTPUT_JSON');
const html=fs.readFileSync(input,'utf8');
const clean=value=>value.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#160;|&nbsp;/g,' ').replace(/\[[0-9]+\]/g,'').replace(/\s+/g,' ').trim();
const records=[];
for(const section of html.matchAll(/<section data-mw-section-id="([1-9]|[12][0-9]|3[0-5])"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<\/section>)/g)) {
  const parent=clean(section[2]).replace(/\s*산하$/,'');
  let type='기타공공기관';
  for(const token of section[3].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>|<li[^>]*>([\s\S]*?)<\/li>/g)) {
    if(token[1]) { type=clean(token[1]); continue; }
    const item=token[2]||''; const name=clean(item.match(/<a[^>]+rel="mw:WikiLink"[^>]*>([\s\S]*?)<\/a>/)?.[1]||item);
    if(name&&name.length<80&&!/공기업|준정부기관|공공기관$/.test(name)) records.push({name,parent,type});
  }
}
const unique=[...new Map(records.map(row=>[row.name,row])).values()].sort((a,b)=>a.parent.localeCompare(b.parent,'ko')||a.name.localeCompare(b.name,'ko'));
fs.writeFileSync(output,JSON.stringify({source:'Wikipedia candidate list; verify against ALIO before collector activation',generatedAt:new Date().toISOString(),count:unique.length,items:unique},null,2)+'\n');
console.log(`wrote ${unique.length} institutions to ${output}`);
