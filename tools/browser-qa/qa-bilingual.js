const target=/*qa-target*/null || 'http://127.0.0.1:8796/';
const expected=/*qa-build*/null;
const page=await openTab('about:blank'), results=[], failures=[];
let captured=false, built;
const check=(name,value)=>{results.push({name,pass:!!value});if(!value)failures.push(name);};
async function ready(test){for(let attempt=0;attempt<100;attempt++){if(await page.evaluate(test))return;await new Promise(resolve=>setTimeout(resolve,60));}throw Error('Browser condition timed out: '+test);}
try{
 await page.goto(target+'?_qa='+Date.now()+'#/sutra/01');
 await ready(()=>document.documentElement.dataset.sutra==='01'&&document.documentElement.dataset.ready==='1');
 captured=await page.evaluate(()=>{sessionStorage.setItem('sutra-qa-initial-language',JSON.stringify(localStorage.getItem('sutra-lab-language')));return true;});
 built=await page.evaluate(()=>document.documentElement.dataset.loadedBuild);check('requested-build',!!built&&(!expected||built===expected));
 await page.evaluate(()=>{const selector=document.querySelector('#language');selector.value='ko';selector.dispatchEvent(new Event('change',{bubbles:true}));});
 await ready(()=>document.documentElement.lang==='ko'&&document.documentElement.dataset.ready==='1');
 const ko=await page.evaluate(()=>{document.querySelector('#reset-example').click();const field=document.querySelector('[data-control="a"]');field.value='37';field.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#show-all').click();return {steps:document.querySelectorAll('#steps li').length,text:document.querySelector('h1').textContent,answer:document.querySelector('.result-panel strong').textContent};});
 await page.evaluate(()=>{const selector=document.querySelector('#language');selector.value='en';selector.dispatchEvent(new Event('change',{bubbles:true}));});
 await ready(()=>document.documentElement.lang==='en'&&document.documentElement.dataset.ready==='1');
 const en=await page.evaluate(()=>({route:location.hash,title:document.querySelector('h1').textContent,value:document.querySelector('[data-control="a"]').value,steps:document.querySelectorAll('#steps li').length,answer:document.querySelector('.result-panel strong').textContent,nav:document.querySelectorAll('.lesson-nav a').length,notice:!!document.querySelector('#update-notice')}));
 check('switch-with-edits-preserves-route-draft-result-and-expanded-steps',en.route==='#/sutra/01'&&ko.text!==en.title&&en.value==='37'&&ko.answer===en.answer&&ko.steps===en.steps&&en.steps>1);
 check('all-16-links-and-no-update-notice',en.nav===16&&!en.notice);
 await page.evaluate(()=>document.querySelector('.lesson-nav [href="#/sutra/16"]').click());
 await ready(()=>document.documentElement.dataset.sutra==='16'&&document.documentElement.dataset.ready==='1');
 await page.evaluate(()=>history.back());await ready(()=>document.documentElement.dataset.sutra==='01'&&document.documentElement.dataset.ready==='1');
 await page.evaluate(()=>history.forward());await ready(()=>document.documentElement.dataset.sutra==='16'&&document.documentElement.dataset.ready==='1');
 check('edited-lesson-to-16-with-browser-back-and-forward',true);
 const token=await page.evaluate(()=>document.documentElement.dataset.documentToken);
 await page.evaluate(()=>location.reload());await ready(()=>document.documentElement.lang==='en'&&document.documentElement.dataset.sutra==='16'&&document.documentElement.dataset.ready==='1');
 check('reload-preserves-English-and-deep-link',(await page.evaluate(()=>document.documentElement.dataset.documentToken))!==token);
 await page.evaluate(()=>document.querySelector('#open-card').click());await ready(()=>document.querySelector('#modal img')?.naturalWidth>0);
 check('original-card-labelled-Korean-on-English-screen',await page.evaluate(()=>document.querySelector('#modal p').textContent.includes('Korean')&&document.querySelector('#modal img').naturalWidth===800));
 await page.evaluate(()=>{document.querySelector('[data-close-modal]').click();document.querySelector('.lesson-sidebar .back-link').click();});
 await ready(()=>document.documentElement.dataset.screen==='home'&&document.documentElement.dataset.ready==='1');
 check('back-to-all-rules-link',await page.evaluate(()=>document.querySelectorAll('.sutra-card').length===16));
 await page.evaluate(()=>{const frame=document.createElement('iframe');frame.id='bilingual-qa';frame.style.cssText='position:absolute;top:0;left:0;width:320px;height:860px;border:0';frame.src=new URL('.?qa=mobile#/',location.href).href;document.body.append(frame);});
 await ready(()=>document.querySelector('#bilingual-qa').contentDocument?.documentElement.dataset.ready==='1');
 for (let batch=0;batch<5;batch++){
   const rows=await page.evaluate(async()=>{
     const frame=document.querySelector('#bilingual-qa'),doc=frame.contentDocument,win=frame.contentWindow,app=win.__SUTRA_APP__;
     if(!win.qaState){win.qaState={next:0,errors:[]};win.addEventListener('error',ev=>win.qaState.errors.push(ev.message));win.addEventListener('unhandledrejection',ev=>win.qaState.errors.push(String(ev.reason)));}
     const routes=['#/',...Array.from({length:16},(_,index)=>'#/sutra/'+String(index+1).padStart(2,'0')),'#/about','#/missing'];
     const runs=[];
     for(const route of routes.slice(win.qaState.next,win.qaState.next+4)){
       if(app.activeHash!==route)await app.navigate(route);
       if(route.startsWith('#/sutra/'))doc.querySelector('#show-all').click();
       const scope=[doc.querySelector('main'),doc.querySelector('footer'),doc.querySelector('.header-nav')],korean=[];
       for(const area of scope){
         const text=area.innerText+(area.querySelector('svg')?.textContent??'');
         if(/[가-힣]/.test(text))korean.push(...text.split('\n').filter(line=>/[가-힣]/.test(line)).map(line=>line.slice(0,150)).slice(0,2));
         for(const el of area.querySelectorAll('[aria-label],[alt],[placeholder]'))for(const attr of ['aria-label','alt','placeholder'])if(/[가-힣]/.test(el.getAttribute(attr)??''))korean.push(el.getAttribute(attr));
       }
       doc.documentElement.getBoundingClientRect();
       runs.push({route,width:win.innerWidth,overflow:doc.documentElement.scrollWidth-win.innerWidth,korean,errors:[...win.qaState.errors]});
     }
     win.qaState.next+=4;return runs;
   });
   for(const row of rows){const pass=row.width===320&&row.overflow<=1&&!row.korean.length&&!row.errors.length;check('English-at-320px:'+row.route,pass);if(!pass)failures.push(row);}
 }
 await page.evaluate(()=>{const selector=document.querySelector('#language');selector.value='ko';selector.dispatchEvent(new Event('change',{bubbles:true}));});
 await ready(()=>document.documentElement.lang==='ko'&&document.documentElement.dataset.ready==='1');
 check('switches-back-to-Korean',await page.evaluate(()=>/[가-힣]/.test(document.querySelector('h1').innerText)&&document.querySelector('#language').value==='ko'));
 await page.evaluate(()=>document.querySelector('.sutra-card[href="#/sutra/02"]').click());await ready(()=>document.documentElement.dataset.sutra==='02'&&document.documentElement.dataset.ready==='1');
 await page.evaluate(()=>{const field=document.querySelector('[data-control="n"]');field.value='121';field.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.lesson-nav [href="#/sutra/14"]').click();});await ready(()=>document.documentElement.dataset.sutra==='14'&&document.documentElement.dataset.ready==='1');
 check('Korean-lesson-nav-also-allows-jumps-after-edits',await page.evaluate(()=>document.documentElement.lang==='ko'&&document.querySelector('.lesson-nav a[aria-current]').hash==='#/sutra/14'));
}catch(error){failures.push(String(error));}
finally{
 if(captured)await page.evaluate(()=>{const previous=JSON.parse(sessionStorage.getItem('sutra-qa-initial-language'));if(previous===null)localStorage.removeItem('sutra-lab-language');else localStorage.setItem('sutra-lab-language',previous);sessionStorage.removeItem('sutra-qa-initial-language');});
 await closeTab(page.id).catch(()=>{});
}
console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',target,build:built,results,failures}));
