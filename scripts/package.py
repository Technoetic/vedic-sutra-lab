from pathlib import Path
import hashlib,json,zipfile,argparse

root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=root/'.local'/'delivery')
target=parser.parse_args().output.resolve()
target.mkdir(parents=True,exist_ok=True)
members=[]
for directory in ['src','data','public','scripts','tests','docs','tools','dist']:
    members.extend(f for f in (root/directory).rglob('*') if f.is_file())
members += [root/f for f in ['package.json','README.md','index.template.html','.gitignore','.gitattributes']]
members=sorted(set(members))
assert all(f.resolve().is_relative_to(root) for f in members)
archive=target/'vedic-sutra-lab.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for f in members:z.write(f,'vedic-sutra-lab/'+f.relative_to(root).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for f in members:assert z.read('vedic-sutra-lab/'+f.relative_to(root).as_posix())==f.read_bytes()
manifest={'task_id':'vedic-sutra-tutorial-20261117','archive':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':[{'path':f.relative_to(root).as_posix(),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in members]}
(target/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'status':'PASS','files':len(members),'zip_bytes':archive.stat().st_size,'sha256':manifest['sha256']}))
