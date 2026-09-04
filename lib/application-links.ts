// Only reviewed application hosts. Unknown destinations remain accessible via the source notice.
const hosts=new Set(['www.sbiz.or.kr','pms.ripc.org','www.sbiz24.kr']);
export function safeApplicationUrl(value:unknown):string|null{
  if(typeof value!=='string'||value.length>2000||/[\u0000-\u0020\u007f\\]/.test(value))return null;
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&hosts.has(url.hostname)?url.href:null;}catch{return null;}
}
