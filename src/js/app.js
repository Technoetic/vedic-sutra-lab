import {HomeScreen} from './screens/HomeScreen.js';
import {LessonScreen} from './screens/LessonScreen.js';
import {AboutScreen} from './screens/AboutScreen.js';
import {CourseService} from './services/CourseService.js';
import {ProgressService} from './services/ProgressService.js';
import {VersionService} from './services/VersionService.js';
import {parseRoute,escapeHTML as e} from './shared/utils.js';

export class SutraApp {
  constructor(){
    this.root=document.querySelector('#app');this.notice=document.querySelector('#update-notice');this.modal=document.querySelector('#modal');
    this.baseURL=new URL('.',location.href);this.loadedBuild=document.querySelector('meta[name="app-build"]').content;
    this.version=new VersionService({loadedBuild:this.loadedBuild,versionURL:new URL('version.json',this.baseURL).href});
    this.course=new CourseService({url:new URL('data/sutras.json',this.baseURL).href});
    this.progress=new ProgressService().load();this.sequence=0;this.navigationRequest=0;this.activeHash=location.hash||'#/';this.token=crypto.randomUUID();
    this.historyIndex=Number.isInteger(history.state?.sutraIndex)?history.state.sutraIndex:0;
    history.replaceState({...history.state,sutraIndex:this.historyIndex},'',location.href);
    document.documentElement.dataset.documentToken=this.token;document.documentElement.dataset.loadedBuild=this.loadedBuild;
    this.bind();
  }
  bind(){
    document.addEventListener('click',event=>{if(event.target.closest('.skip-link')){event.preventDefault();this.root.focus();this.root.scrollIntoView();return;}const a=event.target.closest('a[data-route]');if(!a||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();this.navigate(new URL(a.href).hash);});
    window.addEventListener('popstate',()=>this.handleHistory());
    window.addEventListener('hashchange',()=>this.handleHistory());
    window.addEventListener('focus',()=>this.backgroundCheck());
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')this.backgroundCheck();});
    window.addEventListener('pageshow',event=>{if(event.persisted)this.backgroundCheck();});
    window.addEventListener('beforeunload',event=>{if(this.screen?.dirty||this.progress.saving){event.preventDefault();event.returnValue='';}});
    this.modal.addEventListener('click',event=>{if(event.target===this.modal||event.target.closest('[data-close-modal]'))this.closeCard();});
    document.addEventListener('keydown',event=>{if(this.modal.hidden)return;if(event.key==='Escape')this.closeCard();if(event.key==='Tab'){const nodes=[...this.modal.querySelectorAll('button,a[href]')];if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  }
  async start(){await this.render(location.hash||'#/');}
  handleHistory(){
    const targetIndex=history.state?.sutraIndex;
    if(this.restoreIndex!==undefined&&targetIndex===this.restoreIndex){this.restoreIndex=undefined;this.pendingHistoryHash=null;return;}
    if(location.hash===this.activeHash){if(Number.isInteger(targetIndex))this.historyIndex=targetIndex;return;}
    if(location.hash===this.pendingHistoryHash)return;
    let index=targetIndex;
    if(!Number.isInteger(index)||index===this.historyIndex){index=this.historyIndex+1;history.replaceState({...history.state,sutraIndex:index},'',location.href);}
    this.pendingHistoryHash=location.hash;
    this.navigate(location.hash||'#/',{history:true,targetIndex:index});
  }
  async navigate(hash,{history:fromHistory=false,targetIndex}={}){
    const target=new URL(location.href);target.hash=hash;
    const request=++this.navigationRequest;
    const result=await this.version.beforeNavigate(target.href,{
      isDirty:()=>this.screen?.dirty||false,isSaving:()=>this.progress.saving,
      commit:(url,replace)=>{if(request!==this.navigationRequest)return;replace?location.replace(url):location.assign(url);},replace:fromHistory,
      notify:message=>{if(request!==this.navigationRequest)return;this.pendingHash=hash;this.pendingNavigation={hash,history:fromHistory,targetIndex};this.showProtection(message);}
    });
    if(request!==this.navigationRequest)return;
    if(result==='blocked'){if(fromHistory&&Number.isInteger(targetIndex)&&targetIndex!==this.historyIndex){this.restoreIndex=this.historyIndex;history.go(this.historyIndex-targetIndex);}this.pendingHistoryHash=null;return;}
    if(result==='document')return;
    this.hideNotice();
    if(!fromHistory&&target.hash===this.activeHash)return;
    if(!fromHistory){this.historyIndex++;history.pushState({sutraIndex:this.historyIndex},'',target);}else if(Number.isInteger(targetIndex))this.historyIndex=targetIndex;
    await this.render(hash);
    this.pendingHistoryHash=null;
  }
  async render(hash){
    const request=++this.sequence;this.fetchController?.abort();this.fetchController=new AbortController();
    this.screen?.destroy();this.screen=null;this.closeCard();this.activeHash=hash;
    document.documentElement.dataset.ready='0';
    this.root.innerHTML='<div class="loading-state" role="status"><span class="loading-orbit" aria-hidden="true"></span><p>생각의 도구를 준비하고 있어요…</p></div>';
    try{
      const lessons=await this.course.load({signal:this.fetchController.signal});if(request!==this.sequence)return;
      this.lessons=lessons;const route=parseRoute(hash);this.route=route;
      if(route.screen==='home')this.screen=new HomeScreen(this.root,{lessons,progress:this.progress});
      else if(route.screen==='lesson')this.screen=new LessonScreen(this.root,{lesson:lessons.find(l=>l.id===route.id),lessons,progress:this.progress,onChange:()=>this.changed(),onCard:l=>this.openCard(l)});
      else if(route.screen==='about')this.screen=new AboutScreen(this.root);
      else{this.root.innerHTML='<section class="empty"><p class="eyebrow">404 / A DIFFERENT PATH</p><h1>이 규칙은 아직 여기 없어요.</h1><p>01번부터 16번까지, 탐색실에서 다시 골라 보세요.</p><a class="btn btn-primary" data-route href="#/">전체 규칙 보기 →</a></section>';this.screen={dirty:false,destroy(){}};}
      this.screen.render?.();document.title=route.screen==='lesson'?`${lessons.find(l=>l.id===route.id).title} — SUTRA / LAB`:'SUTRA / LAB — 16가지 수트라 탐색실';
      document.documentElement.dataset.screen=route.screen;document.documentElement.dataset.sutra=route.id||'';document.documentElement.dataset.ready='1';
      window.scrollTo({top:0,behavior:'instant'});this.root.setAttribute('tabindex','-1');this.root.focus({preventScroll:true});
    }catch(error){if(request!==this.sequence||this.fetchController.signal.aborted)return;this.root.innerHTML='<section class="error-state"><p class="eyebrow">잠깐 쉬어 가요</p><h1>학습 자료를 불러오지 못했어요.</h1><p>연결을 확인한 뒤 다시 시도해 주세요. 저장한 실험은 지우지 않습니다.</p><button class="btn btn-primary" id="retry-course">다시 불러오기</button></section>';this.root.querySelector('#retry-course').addEventListener('click',()=>this.render(hash),{once:true});document.documentElement.dataset.screen='error';document.documentElement.dataset.ready='1';}
  }
  changed(){document.documentElement.dataset.dirty=String(Boolean(this.screen?.dirty));}
  hideNotice(){this.notice.hidden=true;this.pendingHash=null;this.pendingNavigation=null;}
  resumePending(){
    const pending=this.pendingNavigation;if(!pending)return;
    this.hideNotice();
    if(pending.history&&Number.isInteger(pending.targetIndex)&&pending.targetIndex!==this.historyIndex)history.go(pending.targetIndex-this.historyIndex);
    else this.navigate(pending.hash);
  }
  showProtection(message){
    this.notice.hidden=false;this.notice.innerHTML=`<div><strong>실험한 숫자를 그대로 남겨 둘게요.</strong><p>${e(message)}</p></div><div class="notice-actions"><button class="btn btn-primary" data-save-go>저장하고 이동</button><button class="text-button" data-discard-go>변경 취소 후 이동</button><button class="text-button" data-stay>계속 살펴보기</button></div>`;
    this.notice.querySelector('[data-save-go]').onclick=async()=>{if(this.screen?.save&&await this.screen.save()){if(this.screen.dirty){this.showProtection('저장 중 바꾼 숫자가 남아 있어요. 다시 저장하거나 취소해 주세요.');return;}this.resumePending();}};
    this.notice.querySelector('[data-discard-go]').onclick=()=>{if(this.progress.saving){this.showProtection('저장이 끝나면 변경을 취소할 수 있어요.');return;}this.screen?.discard?.();this.resumePending();};
    this.notice.querySelector('[data-stay]').onclick=()=>this.hideNotice();
  }
  async backgroundCheck(){const result=await this.version.check();if(result.changed&&!this.pendingHash){this.notice.hidden=false;this.notice.innerHTML='<p><strong>새 내용이 준비됐어요.</strong> 다음 화면으로 이동할 때 반영됩니다. 바꾼 숫자가 있다면 먼저 저장해 주세요.</p>';}}
  openCard(lesson){
    this.returnFocus=document.activeElement;const url=new URL(lesson.cardPath,this.baseURL);this.modal.hidden=false;this.modal.innerHTML=`<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="card-title"><header><h2 id="card-title">${lesson.id}. ${e(lesson.title)}</h2><button class="text-button" data-close-modal aria-label="이미지 카드 닫기">닫기 ×</button></header><div class="card-image-state" role="status">이미지 카드를 불러오고 있어요…</div><img class="lesson-card-image" src="${e(url.href)}" width="800" height="1200" alt="${e(lesson.title)}의 계산 예제와 조건을 설명한 이미지 카드"><p>원전의 적용 예시를 현대적인 학습 카드로 정리했습니다.</p></section>`;document.body.classList.add('modal-open');const img=this.modal.querySelector('img');img.onload=()=>{this.modal.querySelector('.card-image-state').textContent='';};img.onerror=()=>{this.modal.querySelector('.card-image-state').textContent='이미지를 불러오지 못했어요. 튜토리얼의 계산 예제는 계속 사용할 수 있습니다.';};this.modal.querySelector('[data-close-modal]').focus();
  }
  closeCard(){if(!this.modal||this.modal.hidden)return;this.modal.hidden=true;this.modal.innerHTML='';document.body.classList.remove('modal-open');if(this.returnFocus?.isConnected)this.returnFocus.focus();}
}
if(typeof document!=='undefined'){
  const app=new SutraApp();window.__SUTRA_APP__=app;app.start();
}
