let sequence=0;
export function freshURL(input){
  const text=String(input);const relative=!/^[a-z][a-z\d+.-]*:/i.test(text);
  const url=new URL(text,globalThis.location?.href||'https://sutra.local/');
  url.searchParams.set('_fresh',`${Date.now().toString(36)}-${++sequence}`);
  return relative&&text.startsWith('/')?url.pathname+url.search+url.hash:url.href;
}
