import test from 'node:test';
import assert from 'node:assert/strict';
import {SutraApp} from '../src/js/app.js';
import {VersionService} from '../src/js/services/VersionService.js';
function setup(dirty=false){
  const pending=[],commits=[],rendered=[],pushed=[],app=Object.create(SutraApp.prototype);
  app.navigationRequest=0;app.screen={dirty};app.progress={saving:false};app.historyIndex=0;app.activeHash='#/';
  app.version=new VersionService({loadedBuild:'A',versionURL:'https://example.test/version.json',fetcher:()=>new Promise(resolve=>pending.push(resolve))});
  app.render=async hash=>{rendered.push(hash);app.activeHash=hash;};
  globalThis.location={hash:'#/',href:'https://example.test/#/',assign:url=>commits.push(new URL(url).hash),replace:url=>commits.push(new URL(url).hash)};
  globalThis.history={state:{sutraIndex:0},pushState(state,title,url){pushed.push(url.hash);this.state=state;location.hash=url.hash;}};
  return {app,pending,commits,rendered,pushed,resolve:(i,buildId='B')=>pending[i]({ok:true,json:async()=>({buildId})})};
}
test('a slow older version response cannot override the latest intended full-document target',async()=>{
  const f=setup();const first=f.app.navigate('#/sutra/01');const second=f.app.navigate('#/sutra/02');
  f.resolve(1);await second;f.resolve(0);await first;
  assert.deepEqual(f.commits,['#/sutra/02']);
});
test('a dirty screen can jump to any lesson; only the latest click renders',async()=>{
  const f=setup(true);const first=f.app.navigate('#/sutra/01');const second=f.app.navigate('#/sutra/02');
  f.resolve(1,'A');await second;f.resolve(0,'A');await first;
  assert.deepEqual(f.rendered,['#/sutra/02']);assert.deepEqual(f.pushed,['#/sutra/02']);
});
test('Back and Forward can leave an edited example without adding a history entry',async()=>{
  const f=setup(true);
  for(const [index,hash] of [[1,'#/sutra/16'],[0,'#/']]){
    const pass=f.app.navigate(hash,{history:true,targetIndex:index});
    f.resolve(f.pending.length-1,'A');await pass;
    assert.equal(f.app.historyIndex,index);
  }
  assert.deepEqual(f.rendered,['#/sutra/16','#/']);assert.deepEqual(f.pushed,[]);
});
test('rapid Back then Forward to the visible page cancels the pending Back',async()=>{
  const f=setup(true);f.app.historyIndex=1;f.app.activeHash='#/sutra/02';
  location.hash='#/sutra/01';history.state={sutraIndex:0};f.app.handleHistory();
  location.hash='#/sutra/02';history.state={sutraIndex:1};f.app.handleHistory();
  f.resolve(0);await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(f.commits,[]);assert.deepEqual(f.rendered,[]);assert.equal(f.app.historyIndex,1);
});
