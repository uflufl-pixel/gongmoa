import { env } from 'cloudflare:workers';
import { BOJO_PAGE_SIZE, unpackBojoPage } from '../lib/bojo-page';
import { ensureSeeded } from './queries';
import { parseBojoItems, upsertCollected } from './sync';

const currentYear=()=>new Date(Date.now()+9*3600000).getUTCFullYear();

export async function backfillStatus() {
  return await env.DB.prepare('SELECT year,next_page,total_rows,scanned_rows,completed,updated_at FROM bojo_backfills WHERE year=?').bind(currentYear()).first()
    || {year:currentYear(),next_page:1,total_rows:null,scanned_rows:0,completed:0,updated_at:0};
}

export async function backfillStep() {
  if(!env.BOJO_API_KEY) throw new Error('보조금 인증키가 설정되지 않았습니다.');
  await ensureSeeded();
  const year=currentYear(),now=Date.now(),token=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO bojo_backfills (year) VALUES (?) ON CONFLICT(year) DO NOTHING').bind(year).run();
  const locked=await env.DB.prepare('UPDATE bojo_backfills SET lease_token=?,lease_until=? WHERE year=? AND completed=0 AND lease_until<? RETURNING next_page')
    .bind(token,now+300000,year,now).first<{next_page:number}>();
  if(!locked) return {progress:await backfillStatus(),busy:true};
  try {
    const url=new URL('https://apis.data.go.kr/1051000/MoefOpenAPI2025/T_OPD_ASBS_PBNS_UNITY');
    url.searchParams.set('serviceKey',decodeURIComponent(env.BOJO_API_KEY));
    url.searchParams.set('pageNo',String(locked.next_page));
    url.searchParams.set('numOfRows',String(BOJO_PAGE_SIZE));
    url.searchParams.set('resultType','json');
    url.searchParams.set('bsnsyear',String(year));
    const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{accept:'application/json'}});
    if(!response.ok) throw new Error(`보조금 API HTTP ${response.status}`);
    const page=unpackBojoPage(await response.json(),locked.next_page,BOJO_PAGE_SIZE);
    const collection=await upsertCollected(parseBojoItems(page.rows));
    // Advance only after every notice has persisted. On failure, retry this page.
    await env.DB.prepare('UPDATE bojo_backfills SET next_page=?,total_rows=?,scanned_rows=scanned_rows+?,completed=?,lease_token=NULL,lease_until=0,updated_at=? WHERE year=? AND lease_token=?')
      .bind(page.nextPage??locked.next_page,page.total,page.rows.length,page.nextPage===null?1:0,Date.now(),year,token).run();
    return {progress:await backfillStatus(),collection,busy:false};
  } finally {
    await env.DB.prepare('UPDATE bojo_backfills SET lease_token=NULL,lease_until=0 WHERE year=? AND lease_token=?').bind(year,token).run();
  }
}
