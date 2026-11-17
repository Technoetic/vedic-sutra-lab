import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSutra} from '../src/js/domain/math.js';
import {renderDiagram} from '../src/js/ui/diagrams.js';

const hangul = /[가-힣]/;
test('each English experiment keeps the same arithmetic, with English steps and diagrams', () => {
  for (let id = 1; id <= 16; id++) {
    const korean = evaluateSutra(id);
    const english = evaluateSutra(id, {}, 'en');
    assert.equal(english.valid, true);
    assert.deepEqual(english.diagram, korean.diagram);
    assert.equal(english.steps.length, korean.steps.length);
    assert.doesNotMatch(JSON.stringify(english), hangul, 'model ' + id);
    assert.doesNotMatch(renderDiagram(english.diagram, 'en'), hangul, 'diagram ' + id);
    assert.match(renderDiagram(korean.diagram, 'ko'), hangul);
  }
});

test('alternative answers and validation explain the actual inputs in the selected language', () => {
  for (const [id, values] of [[2,{n:210}],[5,{a:7,b:7}],[6,{q:6,k:2}],[9,{h:0.007}],[9,{h:''}],[12,{denominator:17}],[99,{}],[1,null]]) {
    const result = evaluateSutra(id, values, 'en');
    assert.equal(result.valid, false);
    assert.match(result.error, /[A-Za-z]/);
    assert.doesNotMatch(result.error, hangul);
  }
  assert.match(evaluateSutra(8, {p:2,q:6}, 'en').answer, /√10 or/);
  const decimal = evaluateSutra(12, {denominator:13}, 'en');
  assert.equal(decimal.answer, '0.(076923)');
  assert.match(renderDiagram(decimal.diagram, 'en'), /076923/);
  for (const mode of ['wrong','sameSumError','correct']) {
    const result = evaluateSutra(15, {mode}, 'en');
    assert.doesNotMatch(JSON.stringify(result) + renderDiagram(result.diagram,'en'), hangul);
  }
  assert.doesNotMatch(renderDiagram(null, 'en') + renderDiagram({kind:'unknown'}, 'en'), hangul);
});
