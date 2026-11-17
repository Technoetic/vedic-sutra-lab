import {spawnSync} from 'node:child_process';
for(const variant of ['A','B']){
 const p=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:process.cwd(),env:{...process.env,OUT_DIR:'.local/qa/'+variant,BUILD_ID:'qa-'+variant},encoding:'utf8'});
 if(p.status!==0)throw Error(p.stderr||p.stdout);console.log(p.stdout.trim());
}
