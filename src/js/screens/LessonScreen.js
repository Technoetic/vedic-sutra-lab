import {escapeHTML as e,copy} from '../shared/utils.js';
import {evaluateSutra} from '../domain/math.js';
import {renderDiagram} from '../ui/diagrams.js';
export class LessonScreen {
  constructor(root,{lesson,lessons,progress,onChange,onCard,onNavigate}){this.root=root;this.lesson=lesson;this.lessons=lessons;this.progress=progress;this.onChange=onChange;this.onCard=onCard;this.onNavigate=onNavigate;this.values=copy(progress.values[lesson.id]||lesson.defaults);this.baseline=JSON.stringify(this.values);this.visibleSteps=1;this.controller=new AbortController();}
  render(){const l=this.lesson;
    this.root.innerHTML=`<section class="lesson-layout"><aside class="lesson-sidebar"><a class="back-link" data-route href="#/">← 16가지 규칙</a><p class="eyebrow">EXPLORE AT YOUR OWN PACE</p><nav class="lesson-nav" aria-label="16가지 수트라">${this.lessons.map(x=>`<a data-route href="#/sutra/${x.id}"${x.id===l.id?' aria-current="page"':''}><span>${x.id}</span>${e(x.title)}</a>`).join('')}</nav></aside><div class="lesson-main"><header class="lesson-heading"><div class="lesson-meta"><span class="eyebrow">SUTRA ${l.id} / 16</span><span class="pill ${l.category==='심화'?'pill-advanced':''}">${e(l.category)}</span></div><h1>${e(l.title)}</h1><p class="roman-name">${e(l.name)}</p><p class="lesson-intro">${e(l.summary)}</p></header><section class="lab-panel" aria-label="숫자를 바꾸는 실험실"><div class="lab-panel-top"><p class="eyebrow">YOUR LITTLE EXPERIMENT</p><button class="text-button" id="reset-example">기본 예제로 ↺</button></div><div class="lab-controls">${l.controls.map(c=>this.control(c)).join('')}</div><div id="live-math"></div><div class="lab-save"><button class="btn btn-secondary" id="save-example">이 예제 저장</button><span id="save-state" role="status">이 브라우저에 저장할 수 있어요.</span></div></section><section class="steps-section"><div class="section-heading"><div><p class="eyebrow">FOLLOW THE THOUGHT</p><h2>생각을 한 단계씩</h2></div><button class="text-button" id="show-all">전체 펼치기</button></div><ol class="steps" id="steps"></ol><button class="btn btn-secondary" id="next-step">다음 단계 보기 +</button></section><section class="conditions"><span class="pill">이럴 때 쓰세요</span><h2>규칙에는 조건이 있어요.</h2><p>${e(l.condition)}</p><p class="condition-tip">${e(l.tip)}</p><div class="source-actions"><a href="${e(l.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-link">원전·교육 자료 ↗</a><button id="open-card" class="text-button">이미지 카드 보기 ↗</button></div></section><nav class="lesson-bottom" aria-label="다른 규칙">${Number(l.id)>1?`<a class="text-link" data-route href="#/sutra/${String(Number(l.id)-1).padStart(2,'0')}">← 이전 규칙</a>`:'<span></span>'}${Number(l.id)<16?`<a class="text-link" data-route href="#/sutra/${String(Number(l.id)+1).padStart(2,'0')}">다음 규칙 →</a>`:'<a class="text-link" data-route href="#/">전체 규칙으로 →</a>'}</nav></div></section>`;
    const opts={signal:this.controller.signal};
    this.root.querySelectorAll('[data-control]').forEach(input=>input.addEventListener('input',()=>{const control=l.controls.find(c=>c.key===input.dataset.control);this.values[input.dataset.control]=input.tagName==='SELECT'?control.options.find(o=>String(o.value)===input.value).value:input.type==='number'||input.type==='range'?Number(input.value):input.value;if(input.type==='number'&&input.value==='')this.values[input.dataset.control]='';const out=this.root.querySelector(`[data-value="${input.dataset.control}"]`);if(out)out.textContent=input.value;this.updateMath();this.onChange?.();},opts));
    this.root.querySelector('#reset-example').addEventListener('click',()=>{this.values=copy(l.defaults);this.render();this.onChange?.();},opts);
    this.root.querySelector('#save-example').addEventListener('click',()=>this.save(),opts);
    this.root.querySelector('#show-all').addEventListener('click',()=>{this.visibleSteps=100;this.updateSteps();},opts);
    this.root.querySelector('#next-step').addEventListener('click',()=>{this.visibleSteps++;this.updateSteps();},opts);
    this.root.querySelector('#open-card').addEventListener('click',()=>this.onCard(l),opts);
    this.updateMath();
  }
  control(c){const v=this.values[c.key]??this.lesson.defaults[c.key];
    if(c.type==='select')return `<label class="control"><span>${e(c.label)}</span><select data-control="${e(c.key)}">${c.options.map(o=>`<option value="${e(o.value)}"${String(v)===String(o.value)?' selected':''}>${e(o.label)}</option>`).join('')}</select></label>`;
    return `<label class="control"><span>${e(c.label)} <output data-value="${e(c.key)}">${e(v)}</output></span><input data-control="${e(c.key)}" aria-label="${e(c.label)}" type="${c.type==='number'?'number':'range'}" min="${c.min}" max="${c.max}" step="${c.step||1}" value="${e(v)}"></label>`;
  }
  updateMath(){
    this.model=evaluateSutra(this.lesson.id,this.values);
    this.root.querySelector('#live-math').innerHTML=this.model.valid?`<div class="math-equation">${e(this.model.equation)}</div><div class="diagram">${renderDiagram(this.model.diagram)}</div><div class="result-panel"><span>계산의 발견</span><strong>${e(this.model.answer)}</strong></div>${this.model.insight?`<p class="insight">${e(this.model.insight)}</p>`:''}${this.model.warning?`<p class="math-warning">${e(this.model.warning)}</p>`:''}`:`<div class="error-state" role="status"><h3>이 숫자는 적용 조건을 벗어나요.</h3><p>${e(this.model.error)}</p></div>`;
    this.root.querySelector('#save-example').disabled=!this.model.valid||this.progress.saving;
    this.updateSteps();
    this.root.querySelector('#save-state').textContent=this.dirty?'숫자를 바꿨어요. 저장하면 다음에도 이어 볼 수 있어요.':this.progress.visited.has(this.lesson.id)?'저장한 예제를 보고 있어요.':'이 브라우저에 저장할 수 있어요.';
  }
  updateSteps(){const steps=this.model?.valid?this.model.steps:[];
    this.root.querySelector('#steps').innerHTML=steps.slice(0,this.visibleSteps).map((s,i)=>`<li class="step"><span class="step-number">${String(i+1).padStart(2,'0')}</span><div><h3>${e(s.title)}</h3><p class="step-math">${e(s.math)}</p>${s.detail?`<p>${e(s.detail)}</p>`:''}</div></li>`).join('');
    const btn=this.root.querySelector('#next-step');btn.hidden=this.visibleSteps>=steps.length||!steps.length;this.root.querySelector('#show-all').hidden=this.visibleSteps>=steps.length||!steps.length;
  }
  async save(){if(!this.model.valid)return false;const button=this.root.querySelector('#save-example');button.disabled=true;button.textContent='저장 중…';const snapshot=copy(this.values);const success=await this.progress.save(this.lesson.id,snapshot);if(success)this.baseline=JSON.stringify(snapshot);button.disabled=false;button.textContent='이 예제 저장';this.root.querySelector('#save-state').textContent=success?(this.dirty?'저장 중 바꾼 숫자가 남아 있어요.':'이 브라우저에 저장했어요.'):'저장하지 못했어요. 입력은 그대로 유지됩니다.';this.onChange?.();return success;}
  discard(){this.values=JSON.parse(this.baseline);this.render();this.onChange?.();}
  get dirty(){return JSON.stringify(this.values)!==this.baseline;}
  destroy(){this.controller.abort();}
}
