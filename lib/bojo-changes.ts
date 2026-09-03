// @ts-expect-error Native Node TypeScript tests share this module with the Worker build.
import {unpackBojoPage, type BojoRow} from './bojo-page.ts';

// A failed date/page invalidates this delta run; never present partial rows as complete.
export async function fetchBojoChanges(key:string, options:{now?:Date;fetcher?:typeof fetch;budgetMs?:number}={}) {
  const fetcher=options.fetcher||fetch;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),options.budgetMs??20000);
  const kst=new Date((options.now||new Date()).getTime()+9*3600000);
  const dates=Array.from({length:2},(_,i)=>{const d=new Date(kst);d.setUTCDate(d.getUTCDate()-i);return d.toISOString().slice(0,10).replaceAll('-','');});
  try {
    const rows=await Promise.all(dates.map(async date=>{
      const rows:BojoRow[]=[];
      for(let page=1;page<=20;page++) {
        controller.signal.throwIfAborted();
        const url=`https://apis.data.go.kr/1051000/MoefOpenAPI2025/T_OPD_ASBS_PBNS_UNITY?serviceKey=${key}&pageNo=${page}&numOfRows=500&resultType=json&bsnsyear=${kst.getUTCFullYear()}&pblanc_updt_dt=${date}`;
        const response=await fetcher(url,{headers:{accept:'application/json','user-agent':'GongmoaCollector/1.0'},signal:controller.signal});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const result=unpackBojoPage(await response.json(),page,500);
        controller.signal.throwIfAborted();
        rows.push(...result.rows);
        if(result.nextPage===null)return rows;
      }
      throw new Error('page limit');
    }));
    return {ok:true as const,rows:rows.flat(),dates};
  } catch {
    // Cancel the sibling date as well. Do not expose a provider URL containing the key.
    controller.abort();
    return {ok:false as const,rows:[] as BojoRow[],dates,message:`국고 변경분 ${dates.join('·')} 수집 미완료: 응답 지연·오류 또는 페이지 한도. 재확인 필요`};
  } finally {clearTimeout(timer);}
}
