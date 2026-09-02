import {env} from 'cloudflare:workers';
import registry from '../data/central-institutions.json';

export async function registerCentralInstitutions(){
  const existing=await env.DB.prepare('SELECT id FROM institutions').all<{id:string}>();
  const ids=new Set(existing.results.map(x=>x.id));
  if(registry.items.every(x=>ids.has(x.id)))return;
  // Idempotent, bounded inserts into the existing durable registry. Existing IDs
  // and domain/source links stay intact; registering does not enable a collector.
  for(let offset=0;offset<registry.items.length;offset+=8){
    await env.DB.batch(registry.items.slice(offset,offset+8).map(item=>env.DB.prepare(
      'INSERT INTO institutions (id,name,"group",created_at) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING'
    ).bind(item.id,item.name,item.scope==='중앙행정기관'?'중앙부처':'준중앙행정기관',Date.now())));
  }
}
export async function centralInstitutions(){
  const registered=await env.DB.prepare('SELECT id FROM institutions').all<{id:string}>();
  const ids=new Set(registered.results.map(x=>x.id));
  const sources=await env.DB.prepare("SELECT institution_id,name,status,last_success_at FROM sources WHERE method='institution-board'").all<{institution_id:string;name:string;status:string;last_success_at:number|null}>();
  return {...registry,items:registry.items.map(item=>({...item,registered:ids.has(item.id),directSources:sources.results.filter(s=>s.institution_id===item.id)}))};
}
