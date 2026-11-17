import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, escapeHTML } from '../src/js/shared/utils.js';
test('every lesson has an independent deep link',()=>{
  for(let n=1;n<=16;n++) assert.equal(parseRoute(`#/sutra/${String(n).padStart(2,'0')}`).id,String(n).padStart(2,'0'));
  assert.equal(parseRoute('#/about').screen,'about');
  assert.equal(parseRoute('').screen,'home');
});
test('unknown or malformed routes do not silently turn into lessons',()=>{
  for(const h of ['#/sutra/17','#/sutra/00','#/missing','#/%E0%A4%A'])assert.equal(parseRoute(h).screen,'not-found');
});
test('learner input cannot become markup',()=>{
  assert.equal(escapeHTML('<img onerror="bad">&\''),'&lt;img onerror=&quot;bad&quot;&gt;&amp;&#39;');
});
