import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {localizeLessons} from '../src/js/shared/lessonCopy.js';
import {HomeScreen} from '../src/js/screens/HomeScreen.js';
import {LessonScreen} from '../src/js/screens/LessonScreen.js';
import {AboutScreen} from '../src/js/screens/AboutScreen.js';

const source=JSON.parse(await readFile(new URL('../data/sutras.json', import.meta.url),'utf8'));
const english=localizeLessons(source,'en');
const progress={visited:new Set(),values:{}};
function screenRoot(){
  const nodes=new Map();
  return {
    querySelector(key){if(!nodes.has(key))nodes.set(key,{addEventListener(){}});return nodes.get(key);},
    querySelectorAll(){return [];}
  };
}

test('English lessons translate all text and keep original control, source, image and saved-example identities',()=>{
  assert.equal(localizeLessons(source,'ko'),source);
  assert.equal(english.length,16);
  for(const [index,lesson] of english.entries()){
    const original=source[index];
    for(const value of [lesson.title,lesson.summary,lesson.tip,lesson.condition,lesson.name,lesson.category,...lesson.tags,
      ...lesson.controls.flatMap(control=>[control.label,...(control.options??[]).map(option=>option.label)])]){
      assert.equal(typeof value,'string',lesson.id);assert.ok(value.length>0);assert.doesNotMatch(value,/[가-힣]/u);
    }
    for(const field of ['id','sourceUrl','defaults','cardPath','visual'])assert.deepEqual(lesson[field],original[field]);
    const inputSchema=({label,options,...rest})=>({...rest,options:options?.map(option=>option.value)});
    assert.deepEqual(lesson.controls.map(inputSchema),original.controls.map(inputSchema));
    assert.equal(lesson.categoryKey,original.category);
  }
});

test('English catalog filters, unaccented Sanskrit search and hero input survive repaint',()=>{
  const root=screenRoot();
  const screen=new HomeScreen(root,{lessons:english,progress,locale:'en',state:{category:'기초',query:'Ekadhikena',seed:5}});
  screen.render();
  assert.match(root.querySelector('#catalog-grid').innerHTML,/#\/sutra\/01/);
  assert.equal(root.querySelector('#catalog-count').textContent,'1 rule · search results');
  assert.match(root.innerHTML,/id="hero-result">3025/);
  assert.match(root.innerHTML,/aria-pressed="true" data-filter="기초">Foundations/);
  assert.deepEqual(screen.getState(),{category:'기초',query:'Ekadhikena',seed:5});
});

test('switching language keeps edits and revealed steps without saving them',()=>{
  const oldScreen=new LessonScreen(screenRoot(),{lesson:source[0],lessons:source,progress});
  oldScreen.values.a=7;oldScreen.visibleSteps=3;
  const root=screenRoot(),newScreen=new LessonScreen(root,{lesson:english[0],lessons:english,progress,locale:'en',state:oldScreen.getState()});
  newScreen.render();
  assert.equal(newScreen.values.a,7);
  assert.equal(newScreen.visibleSteps,3);
  assert.equal(newScreen.dirty,true);
  assert.match(root.innerHTML,/value="7"/);
  assert.match(root.innerHTML,/Save this example/);
  assert.equal((root.innerHTML.match(/data-route href="#\/sutra\/\d\d"[^>]*><span>/g)??[]).length,16);
  assert.equal(progress.visited.size,0);
  assert.notEqual(newScreen.values,oldScreen.values);
});

test('a delayed save does not change the next lesson or disable its save button',async()=>{
  const root=screenRoot();
  let finish;
  const delayed={...progress,saving:true,save:()=>new Promise(resolve=>{finish=resolve;})};
  const first=new LessonScreen(root,{lesson:english[0],lessons:english,progress:delayed,locale:'en'});
  first.render();
  const finished=first.save();
  first.destroy();
  const next=new LessonScreen(root,{lesson:english[1],lessons:english,progress:delayed,locale:'en'});
  next.render();
  assert.equal(root.querySelector('#save-example').disabled,false);
  const message=root.querySelector('#save-state').textContent;
  finish(true);assert.equal(await finished,true);
  assert.equal(root.querySelector('#save-state').textContent,message);
});

test('English background page explains the source and where examples are stored',()=>{
  const root=screenRoot();
  new AboutScreen(root,{locale:'en'}).render();
  assert.doesNotMatch(root.innerHTML,/[가-힣]/u);
  assert.match(root.innerHTML,/1965/);assert.match(root.innerHTML,/this browser/);
});
