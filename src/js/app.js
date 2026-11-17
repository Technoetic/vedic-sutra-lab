import {HomeScreen} from './screens/HomeScreen.js';
import {LessonScreen} from './screens/LessonScreen.js';
import {AboutScreen} from './screens/AboutScreen.js';
import {CourseService} from './services/CourseService.js';
import {ProgressService} from './services/ProgressService.js';
import {VersionService} from './services/VersionService.js';
import {parseRoute,escapeHTML as e} from './shared/utils.js';
import {readLanguage,writeLanguage,updateShell} from './shared/language.js';
import {localizeLessons} from './shared/lessonCopy.js';

export class SutraApp {
  constructor(){
    this.locale=readLanguage();updateShell(this.locale);
    this.root=document.querySelector('#app');this.modal=document.querySelector('#modal');
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
    document.querySelector('#language').addEventListener('change',event=>this.setLanguage(event.target.value));
    document.addEventListener('click',event=>{if(event.target.closest('.skip-link')){event.preventDefault();this.root.focus();this.root.scrollIntoView();return;}const a=event.target.closest('a[data-route]');if(!a||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();this.navigate(new URL(a.href).hash);});
    window.addEventListener('popstate',()=>this.handleHistory());
    window.addEventListener('hashchange',()=>this.handleHistory());
    window.addEventListener('focus',()=>this.backgroundCheck());
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')this.backgroundCheck();});
    window.addEventListener('pageshow',event=>{if(event.persisted)this.backgroundCheck();});
    this.modal.addEventListener('click',event=>{if(event.target===this.modal||event.target.closest('[data-close-modal]'))this.closeCard();});
    document.addEventListener('keydown',event=>{if(this.modal.hidden)return;if(event.key==='Escape')this.closeCard();if(event.key==='Tab'){const nodes=[...this.modal.querySelectorAll('button,a[href]')];if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  }
  async start(){await this.render(location.hash||'#/');}
  handleHistory(){
    const targetIndex=history.state?.sutraIndex;
    const hash=location.hash||'#/';
    if(hash===this.activeHash){if(this.pendingHistoryHash){this.navigationRequest++;this.pendingHistoryHash=null;}if(Number.isInteger(targetIndex))this.historyIndex=targetIndex;return;}
    if(hash===this.pendingHistoryHash)return;
    let index=targetIndex;
    if(!Number.isInteger(index)||index===this.historyIndex){index=this.historyIndex+1;history.replaceState({...history.state,sutraIndex:index},'',location.href);}
    this.pendingHistoryHash=hash;
    this.navigate(hash,{history:true,targetIndex:index});
  }
  async navigate(hash,{history:fromHistory=false,targetIndex}={}){
    const target=new URL(location.href);target.hash=hash;
    const request=++this.navigationRequest;
    if(!fromHistory)this.pendingHistoryHash=null;
    const result=await this.version.beforeNavigate(target.href,{
      finishSave:async()=>{while(this.progress.saving)await this.progress.queue;},
      commit:(url,replace)=>{if(request!==this.navigationRequest)return;replace?location.replace(url):location.assign(url);},replace:fromHistory
    });
    if(request!==this.navigationRequest)return;
    if(result==='document')return;
    if(!fromHistory&&target.hash===this.activeHash&&(location.hash||'#/')===target.hash)return;
    if(!fromHistory){this.historyIndex++;history.pushState({sutraIndex:this.historyIndex},'',target);}else if(Number.isInteger(targetIndex))this.historyIndex=targetIndex;
    this.pendingHistoryHash=null;
    await this.render(hash);
  }
  setLanguage(locale){
    if(!['ko','en'].includes(locale)||this.locale===locale)return;
    const state=this.screen?.getState?.();this.locale=locale;writeLanguage(locale);updateShell(locale);
    return this.render(this.activeHash,{state,reuseCourse:true});
  }
  async render(hash,{state,reuseCourse=false}={}){
    const locale=this.locale,en=locale==='en';
    const request=++this.sequence;this.fetchController?.abort();this.fetchController=new AbortController();
    this.screen?.destroy();this.screen=null;this.closeCard();this.activeHash=hash;
    document.documentElement.dataset.ready='0';
    this.root.innerHTML=`<div class="loading-state" role="status"><span class="loading-orbit" aria-hidden="true"></span><p>${en?'Preparing the lab…':'생각의 도구를 준비하고 있어요…'}</p></div>`;
    try{
      const catalog=reuseCourse&&this.catalog?this.catalog:await this.course.load({signal:this.fetchController.signal});if(request!==this.sequence)return;
      this.catalog=catalog;const lessons=localizeLessons(catalog,locale);
      this.lessons=lessons;const route=parseRoute(hash);this.route=route;
      const options={lessons,progress:this.progress,locale,state};
      if(route.screen==='home')this.screen=new HomeScreen(this.root,options);
      else if(route.screen==='lesson')this.screen=new LessonScreen(this.root,{...options,lesson:lessons.find(l=>l.id===route.id),onChange:()=>this.changed(),onCard:l=>this.openCard(l)});
      else if(route.screen==='about')this.screen=new AboutScreen(this.root,{locale});
      else{this.root.innerHTML=`<section class="empty"><p class="eyebrow">404 / A DIFFERENT PATH</p><h1>${en?'Rule not found':'이 규칙은 아직 여기 없어요.'}</h1><p>${en?'Choose one of the 16 rules to explore.':'01번부터 16번까지, 탐색실에서 다시 골라 보세요.'}</p><a class="btn btn-primary" data-route href="#/">${en?'Explore all rules':'전체 규칙 보기'} →</a></section>`;this.screen={dirty:false,destroy(){}};}
      this.screen.render?.();document.title=route.screen==='lesson'?`${lessons.find(l=>l.id===route.id).title} — SUTRA / LAB`:en?'SUTRA / LAB — Explore 16 sutras':'SUTRA / LAB — 16가지 수트라 탐색실';
      document.documentElement.dataset.screen=route.screen;document.documentElement.dataset.sutra=route.id||'';document.documentElement.dataset.ready='1';
      if(!reuseCourse){window.scrollTo({top:0,behavior:'instant'});this.root.setAttribute('tabindex','-1');this.root.focus({preventScroll:true});}
    }catch(error){if(request!==this.sequence||this.fetchController.signal.aborted)return;this.root.innerHTML=`<section class="error-state"><h1>${en?'Could not load the lessons.':'학습 자료를 불러오지 못했어요.'}</h1><p>${en?'Check your connection and try again. Saved examples are kept.':'연결을 확인한 뒤 다시 시도해 주세요. 저장한 실험은 지우지 않습니다.'}</p><button class="btn btn-primary" id="retry-course">${en?'Try again':'다시 불러오기'}</button></section>`;this.root.querySelector('#retry-course').addEventListener('click',()=>this.render(hash),{once:true});document.documentElement.dataset.screen='error';document.documentElement.dataset.ready='1';}
  }
  changed(){document.documentElement.dataset.dirty=String(Boolean(this.screen?.dirty));}
  async backgroundCheck(){const result=await this.version.check();document.documentElement.dataset.updateAvailable=String(result.changed);}
  openCard(lesson){
    const en=this.locale==='en';this.returnFocus=document.activeElement;const url=new URL(lesson.cardPath,this.baseURL);this.modal.hidden=false;this.modal.innerHTML=`<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="card-title"><header><h2 id="card-title">${lesson.id}. ${e(lesson.title)}</h2><button class="text-button" data-close-modal aria-label="${en?'Close image card':'이미지 카드 닫기'}">${en?'Close':'닫기'} ×</button></header><div class="card-image-state" role="status">${en?'Loading the image card…':'이미지 카드를 불러오고 있어요…'}</div><img class="lesson-card-image" src="${e(url.href)}" width="800" height="1200" alt="${e(lesson.title)} — ${en?'illustrated example (Korean)':'계산 예제와 조건을 설명한 이미지 카드'}"><p>${en?'This original study card is in Korean. The interactive example and steps are available in English.':'원전의 적용 예시를 현대적인 학습 카드로 정리했습니다.'}</p></section>`;document.body.classList.add('modal-open');const img=this.modal.querySelector('img');const status=this.modal.querySelector('.card-image-state');img.onload=()=>{status.textContent='';};img.onerror=()=>{status.textContent=en?'Image unavailable. You can still use the interactive example.':'이미지를 불러오지 못했어요. 튜토리얼의 계산 예제는 계속 사용할 수 있습니다.';};this.modal.querySelector('[data-close-modal]').focus();
  }
  closeCard(){if(!this.modal||this.modal.hidden)return;this.modal.hidden=true;this.modal.innerHTML='';document.body.classList.remove('modal-open');if(this.returnFocus?.isConnected)this.returnFocus.focus();}
}
if(typeof document!=='undefined'){
  const app=new SutraApp();window.__SUTRA_APP__=app;app.start();
}
