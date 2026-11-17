const page=await openTab('about:blank');
const results=[];
async function waitFor(fn){for(let i=0;i<100;i++){if(await page.evaluate(fn))return;await new Promise(r=>setTimeout(r,50));}throw Error('Browser condition timed out: '+fn.toString());}
await page.goto('http://127.0.0.1:8797/');
await waitFor(()=>document.documentElement.dataset.ready==='1');
await page.evaluate(async()=>{localStorage.removeItem('sutra-lab-progress-v1');await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'A',version:'ok',delay:0,course:'ok',revision:0})});});
await page.goto('http://127.0.0.1:8797/');await waitFor(()=>document.documentElement.dataset.ready==='1');
let token=await page.evaluate(()=>__SUTRA_APP__.token);
await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'B'})});document.querySelector('[href="#/sutra/01"][data-route]').click();});
await waitFor(()=>document.documentElement.dataset.loadedBuild==='qa-B'&&document.documentElement.dataset.sutra==='01'&&document.documentElement.dataset.ready==='1');
let state=await page.evaluate(()=>({build:__SUTRA_APP__.loadedBuild,token:__SUTRA_APP__.token,hash:location.hash,errors:window.__qaErrors}));
results.push({check:'open-A-to-B-next-clean-navigation',pass:state.token!==token&&state.hash==='#/sutra/01'&&!state.errors.length,...state});token=state.token;
await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'A'})});document.querySelector('[href="#/sutra/05"][data-route]').click();});
await waitFor(()=>document.documentElement.dataset.loadedBuild==='qa-A'&&document.documentElement.dataset.sutra==='05'&&document.documentElement.dataset.ready==='1');
state=await page.evaluate(()=>({build:__SUTRA_APP__.loadedBuild,token:__SUTRA_APP__.token,hash:location.hash}));results.push({check:'B-to-A-rollback',pass:state.token!==token&&state.hash==='#/sutra/05',...state});token=state.token;

await page.evaluate(async()=>{const i=document.querySelector('[data-control="c"]');i.value='2';i.dispatchEvent(new Event('input',{bubbles:true}));await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'B'})});document.querySelector('[href="#/sutra/01"][data-route]').click();});
await waitFor(()=>document.documentElement.dataset.loadedBuild==='qa-B'&&document.documentElement.dataset.sutra==='01'&&document.documentElement.dataset.ready==='1');
state=await page.evaluate(()=>({build:__SUTRA_APP__.loadedBuild,token:__SUTRA_APP__.token,hash:location.hash,saved:__SUTRA_APP__.progress.values['05']?.c}));results.push({check:'unsaved-example-can-leave-without-prompt-or-persistent-save',pass:state.token!==token&&state.saved===undefined&&state.hash==='#/sutra/01',...state});

await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'A'})});});
await page.goto('http://127.0.0.1:8797/');await waitFor(()=>document.documentElement.dataset.ready==='1');
token=await page.evaluate(()=>__SUTRA_APP__.token);
await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'B',delay:250})});document.querySelector('[href="#/sutra/06"][data-route]').click();});
await waitFor(()=>document.documentElement.dataset.loadedBuild==='qa-B'&&document.documentElement.dataset.sutra==='06'&&document.documentElement.dataset.ready==='1');
state=await page.evaluate(()=>({build:__SUTRA_APP__.loadedBuild,token:__SUTRA_APP__.token,hash:location.hash}));results.push({check:'A-HTML-before-server-B-version-response',pass:state.token!==token&&state.build==='qa-B'&&state.hash==='#/sutra/06',...state});

await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'A',delay:0})});dispatchEvent(new Event('focus'));});
await waitFor(()=>document.documentElement.dataset.updateAvailable==='true');
state=await page.evaluate(()=>({build:__SUTRA_APP__.loadedBuild,token:__SUTRA_APP__.token,hash:location.hash}));const backgroundToken=state.token;
results.push({check:'focus-handler-does-not-background-reload',pass:state.build==='qa-B',...state,lifecycle:'Explicit focus event dispatch; native BFCache not claimed'});
await page.evaluate(()=>document.querySelector('[href="#/about"][data-route]').click());
await waitFor(()=>document.documentElement.dataset.loadedBuild==='qa-A'&&document.documentElement.dataset.screen==='about'&&document.documentElement.dataset.ready==='1');
state=await page.evaluate(()=>({token:__SUTRA_APP__.token,hash:location.hash}));results.push({check:'background-detection-then-full-target-navigation',pass:state.token!==backgroundToken&&state.hash==='#/about',...state});
await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'A',version:'ok',delay:0,course:'ok'})});});
console.log(JSON.stringify({status:results.every(r=>r.pass)?'PASS':'FAIL',results,unverified:['Native BFCache restoration and actual external hosting cache/CDN']}));
