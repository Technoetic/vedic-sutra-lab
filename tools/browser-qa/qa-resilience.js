const page=await openTab('about:blank');const results=[];
async function waitFor(fn){for(let i=0;i<100;i++){if(await page.evaluate(fn))return;await new Promise(r=>setTimeout(r,50));}throw Error('Condition timed out: '+fn.toString());}
await page.goto('http://127.0.0.1:8797/');await waitFor(()=>document.documentElement.dataset.ready==='1');
await page.evaluate(async()=>{localStorage.removeItem('sutra-lab-progress-v1');await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'A',version:'ok',delay:0,course:'ok',revision:0})});});
await page.goto('http://127.0.0.1:8797/');await waitFor(()=>document.documentElement.dataset.ready==='1');
await page.evaluate(()=>document.querySelector('.skip-link').click());
results.push(await page.evaluate(()=>({check:'skip-link-keeps-route-and-focuses-main',pass:location.hash===''&&document.activeElement.id==='app'&&document.documentElement.dataset.screen==='home'})));

await page.evaluate(async()=>{await __SUTRA_APP__.navigate('#/sutra/01');window.__historyBefore=history.length;await __SUTRA_APP__.navigate('#/sutra/01');await __SUTRA_APP__.navigate('#/sutra/01');});
results.push(await page.evaluate(()=>({check:'same-screen-does-not-create-history-entries',pass:history.length===window.__historyBefore})));
await page.evaluate(async()=>{await __SUTRA_APP__.navigate('#/sutra/02');const i=document.querySelector('[data-control="n"]');i.value='358';i.dispatchEvent(new Event('input',{bubbles:true}));history.back();});
await waitFor(()=>!document.querySelector('#update-notice').hidden&&location.hash==='#/sutra/02'&&__SUTRA_APP__.restoreIndex===undefined);
results.push(await page.evaluate(()=>({check:'dirty-Back-restores-original-entry-and-input',pass:location.hash==='#/sutra/02'&&__SUTRA_APP__.screen.values.n===358&&__SUTRA_APP__.screen.dirty,tracked:__SUTRA_APP__.historyIndex,state:history.state.sutraIndex})));
await page.evaluate(()=>document.querySelector('[data-discard-go]').click());await waitFor(()=>document.documentElement.dataset.sutra==='01'&&document.documentElement.dataset.ready==='1');
await page.evaluate(()=>history.forward());await waitFor(()=>document.documentElement.dataset.sutra==='02'&&document.documentElement.dataset.ready==='1');
results.push(await page.evaluate(()=>({check:'discarded-Back-preserves-Forward-entry',pass:location.hash==='#/sutra/02'&&__SUTRA_APP__.historyIndex===history.state.sutraIndex&&!__SUTRA_APP__.screen.dirty})));

await page.goto('http://127.0.0.1:8797/#/sutra/13');await waitFor(()=>document.documentElement.dataset.sutra==='13'&&document.documentElement.dataset.ready==='1');
let token=await page.evaluate(()=>__SUTRA_APP__.token);
await page.evaluate(()=>location.reload());await waitFor(()=>document.documentElement.dataset.sutra==='13'&&document.documentElement.dataset.ready==='1');
let s=await page.evaluate(()=>({hash:location.hash,token:__SUTRA_APP__.token}));results.push({check:'deep-link-normal-refresh',pass:s.hash==='#/sutra/13'&&s.token!==token,...s});token=s.token;

await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({version:'offline'})});await __SUTRA_APP__.navigate('#/about');});
s=await page.evaluate(()=>({screen:document.documentElement.dataset.screen,token:__SUTRA_APP__.token}));results.push({check:'version-network-failure-keeps-app-usable',pass:s.screen==='about'&&s.token===token,...s});
await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({version:'invalid'})});await __SUTRA_APP__.navigate('#/');});
s=await page.evaluate(()=>({screen:document.documentElement.dataset.screen,token:__SUTRA_APP__.token}));results.push({check:'invalid-version-response-keeps-app-usable',pass:s.screen==='home'&&s.token===token,...s});
await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({version:'ok',revision:1})});await __SUTRA_APP__.navigate('#/about');await __SUTRA_APP__.navigate('#/');});
s=await page.evaluate(()=>({token:__SUTRA_APP__.token,title:document.querySelector('.card-title').textContent}));results.push({check:'fresh-data-without-document-reload',pass:s.token===token&&s.title.includes('새 자료1'),...s});
await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({course:'fail',revision:0})});await __SUTRA_APP__.navigate('#/sutra/01');});
results.push(await page.evaluate(()=>({check:'course-error-has-retry',pass:document.documentElement.dataset.screen==='error'&&!!document.querySelector('#retry-course')})));
await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({course:'ok'})});document.querySelector('#retry-course').click();});await waitFor(()=>document.documentElement.dataset.sutra==='01'&&document.documentElement.dataset.ready==='1');
results.push(await page.evaluate(()=>({check:'course-retry-recovers',pass:!!document.querySelector('[data-control="a"]')})));

await page.evaluate(async()=>{__SUTRA_APP__.progress.storage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>new Promise(resolve=>setTimeout(()=>{localStorage.setItem(k,v);resolve();},400))};const i=document.querySelector('[data-control="a"]');i.value='4';i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#save-example').click();await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'B'})});await __SUTRA_APP__.navigate('#/sutra/02');});
s=await page.evaluate(()=>({build:__SUTRA_APP__.loadedBuild,saving:__SUTRA_APP__.progress.saving,value:__SUTRA_APP__.screen.values.a,hash:location.hash}));results.push({check:'save-in-flight-blocks-update-navigation',pass:s.build==='qa-A'&&s.saving&&s.value===4&&s.hash==='#/sutra/01',...s,adapter:'Delayed local-storage persistence adapter, 400ms'});
await waitFor(()=>!__SUTRA_APP__.progress.saving);
await page.evaluate(async()=>{document.querySelector('[data-stay]').click();await __SUTRA_APP__.navigate('#/sutra/02');});await waitFor(()=>document.documentElement.dataset.loadedBuild==='qa-B'&&document.documentElement.dataset.sutra==='02'&&document.documentElement.dataset.ready==='1');
results.push(await page.evaluate(()=>({check:'completed-save-allows-next-update',pass:__SUTRA_APP__.progress.values['01'].a===4})));

await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'A',delay:300})});document.querySelector('[href="#/sutra/03"][data-route]').click();setTimeout(()=>{const i=document.querySelector('[data-control="n"]');i.value='359';i.dispatchEvent(new Event('input',{bubbles:true}));},50);});
await waitFor(()=>!document.querySelector('#update-notice').hidden&&__SUTRA_APP__.screen.dirty);
s=await page.evaluate(()=>({build:__SUTRA_APP__.loadedBuild,hash:location.hash,value:__SUTRA_APP__.screen.values.n}));results.push({check:'editing-during-version-check-is-rechecked',pass:s.build==='qa-B'&&s.hash==='#/sutra/02'&&s.value===359,...s});
await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({delay:0})});document.querySelector('[data-discard-go]').click();});await waitFor(()=>document.documentElement.dataset.loadedBuild==='qa-A'&&document.documentElement.dataset.sutra==='03'&&document.documentElement.dataset.ready==='1');
await page.evaluate(async()=>{__SUTRA_APP__.progress.storage={getItem:k=>localStorage.getItem(k),setItem:()=>{throw new Error('Simulated quota failure');}};const i=document.querySelector('[data-control="a"]');i.value='24';i.dispatchEvent(new Event('input',{bubbles:true}));await __SUTRA_APP__.screen.save();await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'B'})});await __SUTRA_APP__.navigate('#/');});
s=await page.evaluate(()=>({build:__SUTRA_APP__.loadedBuild,value:__SUTRA_APP__.screen.values.a,dirty:__SUTRA_APP__.screen.dirty,error:__SUTRA_APP__.progress.error,hash:location.hash}));results.push({check:'failed-save-keeps-draft-and-blocks-update',pass:s.build==='qa-A'&&s.dirty&&s.value===24&&!!s.error&&s.hash==='#/sutra/03',...s});
results.push(await page.evaluate(async()=>{const a=await fetch('/missing.js'),b=await fetch('/api/missing');const h=await fetch('/index.html'),v=await fetch('/version.json');return {check:'real-404s-and-cache-headers',pass:a.status===404&&b.status===404&&h.headers.get('cache-control')==='no-cache'&&v.headers.get('cache-control')==='no-store',asset:a.status,api:b.status,htmlCache:h.headers.get('cache-control'),versionCache:v.headers.get('cache-control')};}));
results.push(await page.evaluate(()=>({check:'runtime-errors',pass:window.__qaErrors.length===0,errors:window.__qaErrors})));
await page.evaluate(async()=>{await fetch('/__qa/state',{method:'POST',body:JSON.stringify({build:'A',version:'ok',delay:0,course:'ok',revision:0})});__SUTRA_APP__.screen.discard();localStorage.removeItem('sutra-lab-progress-v1');});
console.log(JSON.stringify({status:results.every(r=>r.pass)?'PASS':'FAIL',results}));
