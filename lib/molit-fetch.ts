export const molitListUrl='https://www.molit.go.kr/USR/BORD0201/m_69/LST.jsp?id=N01_B';

// The public load balancer issues a same-URL session redirect. Never forward
// its cookie to another URL, and stop after one cookie-bearing retry.
export async function fetchMolitList(fetcher:typeof fetch=fetch){
  const init={redirect:'manual' as const,signal:AbortSignal.timeout(10000),headers:{accept:'text/html','user-agent':'GongmoaSourceMonitor/1.1 (+https://gongmoa.uflufl.chatgpt.site)'}};
  const response=await fetcher(molitListUrl,init);
  if(![302,307].includes(response.status))return response;
  const location=response.headers.get('location');
  const cookie=response.headers.get('set-cookie')?.match(/(?:^|,\s*)TMOSHCooKie=([A-Za-z0-9+/=_-]+)/)?.[1];
  if(!location||new URL(location,molitListUrl).href!==molitListUrl||!cookie)return response;
  await response.body?.cancel();
  return fetcher(molitListUrl,{...init,headers:{...init.headers,cookie:`TMOSHCooKie=${cookie}`}});
}
