const page = await openTab('about:blank');
let report;
try {
  await page.goto('http://127.0.0.1:8796/');
  for (let i=0;i<80;i++) { if(await page.evaluate(()=>document.documentElement.dataset.ready==='1'))break; await new Promise(r=>setTimeout(r,100)); }
  report=await page.evaluate(async()=>{
    const app=window.__SUTRA_APP__, key='sutra-lab-progress-v1', original=localStorage.getItem(key), rows=[], failures=[];
    const assert=(condition,label)=>{if(!condition)failures.push(label);return Boolean(condition);};
    const snapshot=()=>({equation:document.querySelector('.math-equation')?.innerText,result:document.querySelector('.result-panel')?.innerText,diagram:document.querySelector('.diagram')?.innerHTML.replace(/sutra-diagram-\d+|growth-clip-\d+/g,'ID')});
    try{
      localStorage.removeItem(key);app.progress.load();await app.render('#/');
      assert(document.querySelectorAll('.sutra-card').length===16,'Home should contain 16 cards');
      const initialHero=document.querySelector('#hero-result').textContent;const slider=document.querySelector('#hero-seed');slider.value='6';slider.dispatchEvent(new Event('input',{bubbles:true}));
      const hero={before:initialHero,after:document.querySelector('#hero-result').textContent};assert(hero.after==='4225','Home slider should calculate 65 squared');
      for(let n=1;n<=16;n++){
        const id=String(n).padStart(2,'0');await app.navigate('#/sutra/'+id);const screen=app.screen, before=snapshot(),initialValues={...screen.values};let chosen=null;
        assert(document.documentElement.dataset.sutra===id,'Lesson '+id+' route');
        for(const c of [...screen.lesson.controls].reverse()){
          const values=c.type==='select'?c.options.map(o=>o.value).filter(v=>String(v)!==String(initialValues[c.key])):[c.max,c.min,Number(initialValues[c.key])+Number(c.step||1)];
          for(const value of values){
            screen.values={...initialValues};screen.render();const input=document.querySelector('[data-control="'+c.key+'"]');input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));
            if(screen.model.valid){const now=snapshot();if((now.equation!==before.equation||(id==='13'&&now.result!==before.result))&&now.diagram!==before.diagram){chosen={control:c.key,value};break;}}
          }
          if(chosen)break;
        }
        const after=snapshot();assert(Boolean(chosen),'Lesson '+id+' valid changed control');assert(after.equation!==before.equation||id==='13','Lesson '+id+' equation changed (13 keeps the general fraction identity)');assert(after.diagram!==before.diagram,'Lesson '+id+' diagram changed');
        const resultChanged=after.result!==before.result;assert(resultChanged||id==='06','Lesson '+id+' result changed (06 has invariant solution)');
        assert(!/NaN|undefined|Infinity/.test(document.querySelector('#live-math').innerText),'Lesson '+id+' finite output');
        const all=document.querySelector('#show-all');if(!all.hidden)all.click();const stepCount=document.querySelectorAll('.step').length;assert(stepCount===screen.model.steps.length,'Lesson '+id+' all steps exposed');
        const savedValues={...screen.values},saved=await screen.save();assert(saved&&!screen.dirty,'Lesson '+id+' save successful');
        const stored=JSON.parse(localStorage.getItem(key));assert(JSON.stringify(stored.values[id])===JSON.stringify(savedValues),'Lesson '+id+' persistent storage values');
        await app.navigate('#/');await app.navigate('#/sutra/'+id);
        const reopened=JSON.stringify(app.screen.values)===JSON.stringify(savedValues);assert(reopened,'Lesson '+id+' saved example reopened');
        rows.push({id,kind:app.screen.model.diagram.kind,chosen,equationChanged:after.equation!==before.equation,resultChanged,diagramChanged:after.diagram!==before.diagram,stepCount,saved,reopened});
      }
      await app.navigate('#/sutra/12');document.querySelector('#reset-example').click();await app.screen.save();
      const select=document.querySelector('select');select.value='13';select.dispatchEvent(new Event('input',{bubbles:true}));const dirty13=app.screen.dirty;select.value='7';select.dispatchEvent(new Event('input',{bubbles:true}));const clean7=!app.screen.dirty;select.value='13';select.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#reset-example').click();
      const selectRegression={dirtyAt13:dirty13,cleanAt7:clean7,cleanAfterReset:!app.screen.dirty,value:app.screen.values.denominator};assert(dirty13&&clean7&&selectRegression.cleanAfterReset,'12 select identity and reset regression');
      await app.navigate('#/sutra/15');const mode=document.querySelector('[data-control="mode"]');mode.value='sameSumError';mode.dispatchEvent(new Event('input',{bubbles:true}));
      const check={matchAt1:app.screen.model.diagram.match,mismatchAt2:app.screen.model.diagram.secondLeft!==app.screen.model.diagram.secondRight,warning:document.querySelector('.math-warning')?.innerText};assert(check.matchAt1&&check.mismatchAt2&&Boolean(check.warning),'15 same sum error demonstrates limitation');app.screen.discard();
      await app.navigate('#/sutra/13');const fractions=app.screen.model.diagram.values;const diagramText=document.querySelector('.diagram').textContent;assert(fractions.length===4&&fractions.every(v=>diagramText.includes(v)),'13 all four exact fractional values visible');
      const trigger=document.querySelector('#open-card');trigger.focus();trigger.click();const image=document.querySelector('.lesson-card-image');let decodeError=null;try{await Promise.race([image.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('image decode timeout')),8000))]);}catch(error){decodeError=String(error);}
      const card={opened:!app.modal.hidden,decoded:image.complete&&image.naturalWidth>0,width:image.naturalWidth,height:image.naturalHeight,decodeError,closeFocused:document.activeElement===document.querySelector('[data-close-modal]')};document.querySelector('[data-close-modal]').click();card.closed=app.modal.hidden;card.focusReturned=document.activeElement===trigger;assert(card.opened&&card.decoded&&card.closeFocused&&card.closed&&card.focusReturned,'Image card open/decode/close/focus');
      return {status:failures.length?'FAIL':'PASS',build:app.loadedBuild,hero,lessons:rows,selectRegression,check,fractions,card,failures,restoredStorage:true};
    }catch(error){return {status:'FAIL',error:String(error),stack:error.stack,lessons:rows,failures,restoredStorage:true};}
    finally{if(original===null)localStorage.removeItem(key);else localStorage.setItem(key,original);app.progress.load();if(app.screen?.dirty)app.screen.discard();}
  });
}catch(error){report={status:'FAIL',error:String(error)};}
finally{await closeTab(page.id).catch(()=>{});}
console.log(JSON.stringify(report));
