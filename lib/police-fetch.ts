export const policeListUrl='https://www.police.go.kr/user/bbs/BD_selectBbsList.do?q_bbsCode=1001';
// The public load balancer issues a session on a same-URL redirect.
// Retry only once; never forward its cookie to another URL or persist it.
export async function fetchPoliceList(fetcher:typeof fetch=fetch){
  const init={redirect:'manual' as const,signal:AbortSignal.timeout(10000),headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}};
  const response=await fetcher(policeListUrl,init);
  if(![302,307].includes(response.status))return response;
  const location=response.headers.get('location');
  const cookie=response.headers.get('set-cookie')?.match(/(?:^|,\s*)TMOSHCooKie=([A-Za-z0-9+/=_-]+)/)?.[1];
  if(!location||new URL(location,policeListUrl).href!==policeListUrl||!cookie)return response;
  await response.body?.cancel();
  return fetcher(policeListUrl,{...init,headers:{...init.headers,cookie:`TMOSHCooKie=${cookie}`}});
}
