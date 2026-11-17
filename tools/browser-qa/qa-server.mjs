import http from 'node:http';
import path from 'node:path';
import {readFile,stat} from 'node:fs/promises';
const base=path.resolve('.local/qa');
const state={build:'A',version:'ok',delay:0,course:'ok',revision:0};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/__qa/state'){
   if(req.method==='POST'){let body='';for await(const b of req){body+=b;if(body.length>2048){res.writeHead(413);res.end();return;}}let next;try{next=JSON.parse(body);}catch{res.writeHead(400);res.end();return;}
   if(next.build&&['A','B'].includes(next.build))state.build=next.build;
   if(next.version&&['ok','offline','invalid'].includes(next.version))state.version=next.version;
   if(next.course&&['ok','fail'].includes(next.course))state.course=next.course;
   if(Number.isFinite(next.delay))state.delay=Math.max(0,Math.min(next.delay,800));
   if(Number.isInteger(next.revision))state.revision=next.revision;
   }res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(state));return;
 }
 if(url.pathname==='/version.json'){
   const snapshot={...state};await new Promise(r=>setTimeout(r,snapshot.delay));
   res.writeHead(snapshot.version==='offline'?503:200,{'Content-Type':'application/json','Cache-Control':'no-store'});
   res.end(JSON.stringify(snapshot.version==='invalid'?{buildId:4}:{buildId:'qa-'+snapshot.build}));return;
 }
 if(url.pathname==='/data/sutras.json'&&state.course==='fail'){res.writeHead(503);res.end('Unavailable');return;}
 let name;try{name=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
 if(name==='/')name='/index.html';const root=path.join(base,state.build);const filename=path.resolve(root,'.'+name);
 if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{const s=await stat(filename);if(!s.isFile())throw Error();let data=await readFile(filename);
   if(name==='/index.html')data=Buffer.from(data.toString().replace('<head>','<head><script>window.__qaErrors=[];addEventListener("error",e=>__qaErrors.push(e.message));addEventListener("unhandledrejection",e=>__qaErrors.push(String(e.reason)));<\/script>'));
   if(name==='/data/sutras.json'&&state.revision){const d=JSON.parse(data);d[0].title+=' · 새 자료'+state.revision;data=Buffer.from(JSON.stringify(d));}
   res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':name.endsWith('.html')?'no-cache':name.endsWith('.json')?'no-store':'public,max-age=31536000,immutable'});res.end(data);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('404 Not Found');}
});
server.listen(8797,'127.0.0.1',()=>console.log('QA http://127.0.0.1:8797'));
process.on('SIGTERM',()=>server.close());
