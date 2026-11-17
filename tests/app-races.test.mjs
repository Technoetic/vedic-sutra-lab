import test from 'node:test';
import assert from 'node:assert/strict';
import {SutraApp} from '../src/js/app.js';
import {VersionService} from '../src/js/services/VersionService.js';
function setup(dirty=false){
  const pending=[],commits=[],app=Object.create(SutraApp.prototype);
  app.navigationRequest=0;app.screen={dirty};app.progress={saving:false};
  app.version=new VersionService({loadedBuild:'A',versionURL:'https://example.test/version.json',fetcher:()=>new Promise(resolve=>pending.push(resolve))});
  app.showProtection=()=>{};app.hideNotice=()=>{};app.render=async()=>{};
  globalThis.location={href:'https://example.test/#/',assign:url=>commits.push(new URL(url).hash),replace:url=>commits.push(new URL(url).hash)};
  return {app,pending,commits,resolve:i=>pending[i]({ok:true,json:async()=>({buildId:'B'})})};
}
test('a slow older version response cannot override the latest intended full-document target',async()=>{
  const f=setup();const first=f.app.navigate('#/sutra/01');const second=f.app.navigate('#/sutra/02');
  f.resolve(1);await second;f.resolve(0);await first;
  assert.deepEqual(f.commits,['#/sutra/02']);
});
test('a stale dirty notification cannot overwrite the most recent pending destination',async()=>{
  const f=setup(true);const first=f.app.navigate('#/sutra/01');const second=f.app.navigate('#/sutra/02');
  f.resolve(1);await second;f.resolve(0);await first;
  assert.equal(f.app.pendingHash,'#/sutra/02');
});
