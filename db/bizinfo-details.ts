import {env} from 'cloudflare:workers';
import {parseBizinfoDetail,mergeBizinfoDetail,type BizinfoDetail} from '../lib/bizinfo-detail';

export async function detailStatus(){
  return await env.DB.prepare(`SELECT COUNT(*) AS eligible,
    SUM(CASE WHEN d.checked_at IS NOT NULL THEN 1 ELSE 0 END) AS enriched,
    SUM(CASE WHEN d.last_error IS NOT NULL THEN 1 ELSE 0 END) AS failed,
    SUM(CASE WHEN COALESCE(d.next_attempt_at,0)<=? AND COALESCE(d.lease_until,0)<? THEN 1 ELSE 0 END) AS due
    FROM notices n LEFT JOIN notice_details d ON d.notice_id=n.id
    WHERE n.source_id='bizinfo' AND n.external_id GLOB 'PBLN_[0-9]*'`).bind(Date.now(),Date.now()).first();
}

export async function enrichBizinfoBatch(){
  const now=Date.now();
  // Recover only failures caused by the previous unsupported Worker redirect option.
  await env.DB.prepare("UPDATE notice_details SET next_attempt_at=0,last_error='실행 환경 오류 수정 후 재시도 대기' WHERE last_error LIKE 'Invalid redirect value,%' AND lease_until<?").bind(now).run();
  const candidates=await env.DB.prepare(`SELECT n.id,n.external_id FROM notices n
    LEFT JOIN notice_details d ON d.notice_id=n.id
    WHERE n.source_id='bizinfo' AND n.external_id GLOB 'PBLN_[0-9]*'
    AND COALESCE(d.next_attempt_at,0)<=? AND COALESCE(d.lease_until,0)<?
    ORDER BY COALESCE(d.checked_at,0),n.id LIMIT 5`).bind(now,now).all<{id:string;external_id:string}>();
  const results:Array<{id:string;outcome:string;message?:string}>=[];
  for(const n of candidates.results){
    if(!/^PBLN_[0-9]+$/.test(n.external_id))continue;
    await env.DB.prepare('INSERT INTO notice_details (notice_id) VALUES (?) ON CONFLICT(notice_id) DO NOTHING').bind(n.id).run();
    const token=crypto.randomUUID(),started=Date.now();
    const lock=await env.DB.prepare('UPDATE notice_details SET lease_token=?,lease_until=?,attempts=attempts+1 WHERE notice_id=? AND lease_until<? AND next_attempt_at<=? RETURNING notice_id').bind(token,started+120000,n.id,started,started).first();
    if(!lock)continue;
    try{
      // Fixed origin and validated external ID: never fetch arbitrary stored URLs.
      const response=await fetch('https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId='+n.external_id,{signal:AbortSignal.timeout(10000),redirect:'manual',headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}});
      if(!response.ok)throw new Error('기업마당 상세 HTTP '+response.status);
      const html=await response.text();
      if(html.length>2_000_000)throw new Error('기업마당 상세 응답 크기 초과');
      const detail=parseBizinfoDetail(html),finished=Date.now();
      await env.DB.prepare('UPDATE notice_details SET payload=?,checked_at=?,next_attempt_at=?,last_error=NULL,lease_token=NULL,lease_until=0 WHERE notice_id=? AND lease_token=?').bind(JSON.stringify(detail),finished,finished+86400000,n.id,token).run();
      results.push({id:n.id,outcome:'success'});
    }catch(error){
      const message=error instanceof Error?error.message.slice(0,300):'상세 수집 실패';
      // Keep the last successful payload; a failed fetch must never erase it.
      await env.DB.prepare('UPDATE notice_details SET last_error=?,next_attempt_at=?,lease_token=NULL,lease_until=0 WHERE notice_id=? AND lease_token=?').bind(message,Date.now()+3600000,n.id,token).run();
      results.push({id:n.id,outcome:'failed',message});
    }
  }
  return {results,progress:await detailStatus()};
}

export async function withBizinfoDetails<T extends {id:string;institution:string;audience:string;status:string;closesAt:Date|null;opensAt:Date|null}>(items:T[]){
  const rows=await env.DB.prepare("SELECT d.notice_id,d.payload,d.checked_at FROM notice_details d JOIN notices n ON n.id=d.notice_id WHERE n.source_id='bizinfo' AND d.checked_at IS NOT NULL").all<{notice_id:string;payload:string;checked_at:number}>();
  const byId=new Map(rows.results.map(r=>[r.notice_id,r]));
  return items.map(n=>{const row=byId.get(n.id);return row?mergeBizinfoDetail(n,JSON.parse(row.payload) as BizinfoDetail,row.checked_at):n;});
}
