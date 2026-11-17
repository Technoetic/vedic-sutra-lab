const page=await openTab('about:blank');let report;
try{
 await page.goto('http://127.0.0.1:8796/');
 for(let i=0;i<80;i++){if(await page.evaluate(()=>document.documentElement.dataset.ready==='1'))break;await new Promise(r=>setTimeout(r,100));}
 await page.evaluate(()=>{window.__QA_VIEWPORT_INDEX__=0;});
 const allResults=[],allFailures=[];
 for(let viewport=0;viewport<4;viewport++){
 const batch=await page.evaluate(async()=>{
  const width=[320,390,768,1440][window.__QA_VIEWPORT_INDEX__++];
  const frame=document.createElement('iframe');frame.style.cssText='position:absolute;top:0;left:0;height:1000px;border:0;background:#f6f5ed';frame.setAttribute('title','SUTRA LAB responsive verification');document.body.append(frame);const results=[],failures=[];
  try{
    frame.style.width=width+'px';frame.src=location.origin+'/?_qa=responsive-'+width+'#/';
    await new Promise((resolve,reject)=>{frame.onload=resolve;setTimeout(()=>reject(new Error('iframe load timeout '+width)),9000);});
    const w=frame.contentWindow,doc=w.document;
    for(let i=0;i<80;i++){if(doc.documentElement.dataset.ready==='1'&&w.__SUTRA_APP__)break;await new Promise(r=>setTimeout(r,30));}
    const app=w.__SUTRA_APP__;
    for(const route of ['#/',...Array.from({length:16},(_,i)=>'#/sutra/'+String(i+1).padStart(2,'0'))]){
      if(app.activeHash!==route)await app.navigate(route);
      doc.documentElement.getBoundingClientRect();
      const overflow=doc.documentElement.scrollWidth>w.innerWidth+1;
      const offenders=overflow?[...doc.querySelectorAll('body *')].filter(el=>el.namespaceURI==='http://www.w3.org/1999/xhtml'&&el.getClientRects().length).map(el=>({el,box:el.getBoundingClientRect()})).filter(({el,box})=>box.width>0&&(box.right>w.innerWidth+1||box.left<-1)&&!el.classList.contains('skip-link')).slice(0,8).map(({el,box})=>({tag:el.tagName,cls:el.className,left:Math.round(box.left),right:Math.round(box.right)})):[];
      const inputs=[...doc.querySelectorAll('input:not([type="range"]),select')].map(el=>({type:el.type,font:parseFloat(w.getComputedStyle(el).fontSize),height:Math.round(el.getBoundingClientRect().height)}));
      const badInputs=inputs.filter(input=>input.font<16||input.height<44);
      const result={width,route,viewport:w.innerWidth,scrollWidth:doc.documentElement.scrollWidth,overflow,offenders,badInputs,diagram:route==='#/'?null:Boolean(doc.querySelector('.diagram svg title,.diagram figcaption'))};
      results.push(result);if(overflow||badInputs.length||result.diagram===false)failures.push({width,route,overflow,badInputs,diagram:result.diagram});
    }
   return {results,failures};
  }finally{frame.remove();}
 });allResults.push(...batch.results);allFailures.push(...batch.failures);
 }
 report={status:allFailures.length?'FAIL':'PASS',screens:allResults.length,widths:[320,390,768,1440],results:allResults,failures:allFailures,screenshotError:'Not attempted after root reported two screenshot CDP timeouts; this matrix verifies browser DOM layout and controls.'};
}catch(error){report={status:'FAIL',error:String(error),stack:error.stack};}
finally{await closeTab(page.id).catch(()=>{});}
console.log(JSON.stringify(report));
