import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.env.SERVE_ROOT||'dist');
const port=Number(process.env.PORT||8796);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
  let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Bad URL');return;}
  if(name==='/')name='/index.html';
  const filename=path.resolve(root,'.'+name);
  if(!filename.startsWith(root+path.sep)||name.includes('\0')){res.writeHead(403);res.end('Forbidden');return;}
  try{const info=await stat(filename);if(!info.isFile())throw Error('not a file');const data=await readFile(filename);const cache=name.endsWith('/version.json')||name.startsWith('/data/')?'no-store':name.endsWith('.html')?'no-cache':/\.[0-9a-f]{12}\./.test(name)?'public, max-age=31536000, immutable':'no-cache';res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':cache,'X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('404 Not Found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`SUTRA / LAB  http://127.0.0.1:${port}/`));
process.on('SIGTERM',()=>server.close());
