import {env} from 'cloudflare:workers';
import {parseKoccaDetail,mergeKoccaDetail,type KoccaDetail} from '../lib/kocca-detail';

export async function enrichKoccaBatch(){
  const now=Date.now();
  const candidates=await env.DB.prepare(`SELECT n.id,n.external_id FROM notices n LEFT JOIN notice_details d ON d.notice_id=n.id
    WHERE n.source_id='kocca-support' AND COALESCE(d.next_attempt_at,0)<=? AND COALESCE(d.lease_until,0)<?
    ORDER BY COALESCE(d.checked_at,0),n.id LIMIT 5`).bind(now,now).all<{id:string;external_id:string}>();
  const results:Array<{id:string;outcome:string;message?:string}>=[];
  for(const n of candidates.results){
    if(!/^[A-Z0-9]{12}$/.test(n.external_id))continue;
    await env.DB.prepare('INSERT INTO notice_details (notice_id) VALUES (?) ON CONFLICT(notice_id) DO NOTHING').bind(n.id).run();
    const token=crypto.randomUUID(),started=Date.now();
    const lock=await env.DB.prepare('UPDATE notice_details SET lease_token=?,lease_until=?,attempts=attempts+1 WHERE notice_id=? AND lease_until<? AND next_attempt_at<=? RETURNING notice_id').bind(token,started+120000,n.id,started,started).first();
    if(!lock)continue;
    try{
      const response=await fetch('https://www.kocca.kr/kocca/pims/view.do?intcNo='+n.external_id+'&menuNo=204104',{signal:AbortSignal.timeout(10000),redirect:'manual',headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});
      if(!response.ok)throw new Error('콘텐츠진흥원 상세 HTTP '+response.status);
      const html=await response.text();
      if(html.length>2_000_000)throw new Error('콘텐츠진흥원 상세 응답 크기 초과');
      const detail=parseKoccaDetail(html),finished=Date.now();
      await env.DB.prepare('UPDATE notice_details SET payload=?,checked_at=?,next_attempt_at=?,last_error=NULL,lease_token=NULL,lease_until=0 WHERE notice_id=? AND lease_token=?').bind(JSON.stringify(detail),finished,finished+86400000,n.id,token).run();
      results.push({id:n.id,outcome:'success'});
    }catch(error){
      const message=error instanceof Error?error.message.slice(0,300):'상세 수집 실패';
      await env.DB.prepare('UPDATE notice_details SET last_error=?,next_attempt_at=?,lease_token=NULL,lease_until=0 WHERE notice_id=? AND lease_token=?').bind(message,Date.now()+3600000,n.id,token).run();
      results.push({id:n.id,outcome:'failed',message});
    }
  }
  return {results};
}
export async function withKoccaDetails<T extends {id:string;audience:string;status:string}>(items:T[]){
  const rows=await env.DB.prepare("SELECT d.notice_id,d.payload,d.checked_at FROM notice_details d JOIN notices n ON n.id=d.notice_id WHERE n.source_id='kocca-support' AND d.checked_at IS NOT NULL").all<{notice_id:string;payload:string;checked_at:number}>();
  const byId=new Map(rows.results.map(r=>[r.notice_id,r]));
  return items.map(n=>{const r=byId.get(n.id);return r?mergeKoccaDetail(n,JSON.parse(r.payload) as KoccaDetail,r.checked_at):n;});
}
