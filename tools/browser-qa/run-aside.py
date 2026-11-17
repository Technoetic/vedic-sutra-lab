from pathlib import Path
import subprocess,sys,json,re,base64,shutil,os
root=next(p for p in Path(__file__).resolve().parents if (p/'package.json').is_file())
script=Path(sys.argv[1]);out=root/'test-results'/sys.argv[2];out.parent.mkdir(parents=True,exist_ok=True)
code=script.read_text(encoding='utf-8')
cli=os.environ.get('ASIDE_CLI') or shutil.which('aside.exe') or shutil.which('aside')
if not cli:
    candidate=Path.home()/'AppData/Local/Aside/CLI/current/aside.exe'
    if candidate.is_file():cli=str(candidate)
if not cli:raise FileNotFoundError('Install Aside CLI or set ASIDE_CLI to its executable')
result=subprocess.run([cli,'repl',code],capture_output=True,timeout=120)
out.with_suffix('.stdout.txt').write_bytes(result.stdout)
out.with_suffix('.stderr.txt').write_bytes(result.stderr)
text=result.stdout.decode('utf-8',errors='replace')
decoded=None
for line in text.splitlines():
    try:
        obj=json.loads(re.sub(r'\x1b\[[0-9;]*m','',line))
        if isinstance(obj,dict) and 'status' in obj:decoded=obj
    except json.JSONDecodeError:pass
if decoded is None: print(text[-2500:]);sys.exit(1)
for key in ['screenshot','mobileScreenshot','lessonScreenshot']:
    if decoded.get(key):
        image=decoded.pop(key)
        if isinstance(image,dict):image=image.get('data') or image.get('base64')
        if image.startswith('data:'):image=image.split(',',1)[1]
        out.with_name(out.stem+'-'+key+'.png').write_bytes(base64.b64decode(image))
out.write_text(json.dumps(decoded,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(decoded,ensure_ascii=False))
if result.returncode or decoded['status']!='PASS':sys.exit(1)
