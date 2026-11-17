import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {VersionService} from '../src/js/services/VersionService.js';
import {CourseService} from '../src/js/services/CourseService.js';
test('version queries carry unique freshness keys without losing the hosted subpath',async()=>{
  const urls=[];const service=new VersionService({loadedBuild:'A',versionURL:'https://example.test/vedic-sutra-lab/version.json?locale=ko',fetcher:async url=>{urls.push(new URL(url));return {ok:true,json:async()=>({buildId:'B'})};}});
  assert.equal((await service.check()).changed,true);await service.check();
  assert.ok(urls[0].searchParams.get('_fresh'));assert.notEqual(urls[0].searchParams.get('_fresh'),urls[1].searchParams.get('_fresh'));
  assert.equal(urls[0].pathname,'/vedic-sutra-lab/version.json');assert.equal(urls[0].searchParams.get('locale'),'ko');assert.equal(service.loadedBuild,'A');
});
test('data-only refresh also bypasses a shared static-host cache',async()=>{
  const data=JSON.parse(await readFile(new URL('../data/sutras.json',import.meta.url),'utf8'));const urls=[];
  const service=new CourseService({url:'https://example.test/vedic-sutra-lab/data/sutras.json',fetcher:async url=>{urls.push(new URL(url));return {ok:true,json:async()=>data};}});
  await service.load();await service.load();assert.ok(urls[0].searchParams.get('_fresh'));assert.notEqual(urls[0].searchParams.get('_fresh'),urls[1].searchParams.get('_fresh'));assert.equal(urls[0].pathname,'/vedic-sutra-lab/data/sutras.json');
});
