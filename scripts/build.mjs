import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=path.resolve(root,process.env.OUT_DIR||'dist');
if(dest===root||!dest.startsWith(root+path.sep))throw Error('Output must be within this project');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex').slice(0,12);
await mkdir(path.join(dest,'assets'),{recursive:true});await mkdir(path.join(dest,'data'),{recursive:true});await mkdir(path.join(dest,'cards'),{recursive:true});
const compiled=new Map();
async function compile(filename){
  filename=path.resolve(filename);if(!filename.startsWith(path.join(root,'src')+path.sep))throw Error('Import escapes source');
  if(compiled.has(filename))return compiled.get(filename);
  let text=await readFile(filename,'utf8');const matches=[...text.matchAll(/(from\s*|import\s*)(['"])(\.{1,2}\/[^'"]+)\2/g)];
  for(const m of matches){const child=await compile(path.resolve(path.dirname(filename),m[3]));text=text.replace(m[0],m[1]+m[2]+'./'+child+m[2]);}
  const name=path.basename(filename,'.js')+'.'+hash(text)+'.js';compiled.set(filename,name);await writeFile(path.join(dest,'assets',name),text);return name;
}
const entry=await compile(path.join(root,'src/js/app.js'));
const css=(await Promise.all(['tokens','base','components'].map(n=>readFile(path.join(root,'src/css',n+'.css'),'utf8')))).join('\n');
const cssName='app.'+hash(css)+'.css';await writeFile(path.join(dest,'assets',cssName),css);
const catalog=JSON.parse(await readFile(path.join(root,'data/sutras.json'),'utf8'));
for(const item of catalog){const source=path.join(root,'public/cards',`card-${item.id}.webp`);const bytes=await readFile(source);const name=`card-${item.id}.${hash(bytes)}.webp`;await copyFile(source,path.join(dest,'cards',name));item.cardPath='cards/'+name;}
const data=JSON.stringify(catalog);await writeFile(path.join(dest,'data/sutras.json'),data);
let html=await readFile(path.join(root,'index.template.html'),'utf8');
const buildId=process.env.BUILD_ID||'sutra-'+hash([...compiled.values()].join('')+css+data+html);
html=html.replaceAll('{{BUILD_ID}}',buildId).replaceAll('{{CSS_URL}}','assets/'+cssName).replaceAll('{{JS_URL}}','assets/'+entry);
if(/\{\{[A-Z_]+\}\}/.test(html))throw Error('Unresolved template variable');
await writeFile(path.join(dest,'index.html'),html);await writeFile(path.join(dest,'404.html'),html);
await writeFile(path.join(dest,'version.json'),JSON.stringify({buildId})+'\n');
await writeFile(path.join(dest,'.nojekyll'),'');
const retainedAssetPath=/^(?:assets\/[A-Za-z0-9.-]+\.[a-f0-9]{12}\.(?:js|css)|cards\/card-[0-9]{2}\.[a-f0-9]{12}\.webp)$/;
const manifestPaths=[];
for(const directory of ['assets','cards']){
  for(const entry of await readdir(path.join(dest,directory),{withFileTypes:true})){
    const relative=directory+'/'+entry.name;
    if(entry.isFile()&&retainedAssetPath.test(relative))manifestPaths.push(relative);
  }
}
manifestPaths.sort();
const manifestFiles=await Promise.all(manifestPaths.map(async relative=>{
  const bytes=await readFile(path.join(dest,relative));
  return {path:relative,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
}));
await writeFile(path.join(dest,'asset-manifest.json'),JSON.stringify({schema:1,files:manifestFiles})+'\n');
console.log(JSON.stringify({status:'PASS',buildId,modules:compiled.size,cards:catalog.length,out:dest}));
