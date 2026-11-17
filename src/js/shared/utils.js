export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function parseRoute(hash=''){
  let path;
  try { path=decodeURIComponent(hash.replace(/^#/,'')) || '/'; } catch { return {screen:'not-found'}; }
  if(path==='/')return {screen:'home',hash:'#/'};
  if(path==='/about')return {screen:'about',hash:'#/about'};
  const m=path.match(/^\/sutra\/(\d{1,2})$/);
  if(m && Number(m[1])>=1 && Number(m[1])<=16){const id=m[1].padStart(2,'0');return {screen:'lesson',id,hash:`#/sutra/${id}`};}
  return {screen:'not-found',hash:'#'+path};
}
export const copy=value=>JSON.parse(JSON.stringify(value));
