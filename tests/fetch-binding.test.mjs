import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {VersionService} from '../src/js/services/VersionService.js';
import {CourseService} from '../src/js/services/CourseService.js';
test('the browser default fetch retains its global receiver for both services',async()=>{
  const original=globalThis.fetch;const catalog=JSON.parse(await readFile(new URL('../data/sutras.json',import.meta.url),'utf8'));
  try{
    globalThis.fetch=async function(url){if(this!==globalThis)throw new TypeError('Illegal invocation');return {ok:true,json:async()=>url.includes('version')?{buildId:'A'}:catalog};};
    const v=await new VersionService({loadedBuild:'A',versionURL:'https://example.test/version.json'}).check();
    assert.equal(v.error,undefined);assert.equal(v.build,'A');
    assert.equal((await new CourseService({url:'https://example.test/data.json'}).load()).length,16);
  }finally{globalThis.fetch=original;}
});
