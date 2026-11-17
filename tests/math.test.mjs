import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateSutra } from '../src/js/domain/math.js';

const catalog = JSON.parse(await readFile(new URL('../data/sutras.json', import.meta.url), 'utf8'));

function valid(id, values) {
  const result = evaluateSutra(id, values);
  assert.equal(result.valid, true, result.error);
  assert.ok(result.equation && result.answer);
  assert.ok(result.steps.length >= 2);
  assert.ok(result.steps.every(step => step.title && step.math));
  assert.ok(result.diagram.kind);
  return result;
}

test('all sixteen lessons expose valid defaults and meaningful controls', () => {
  assert.equal(catalog.length, 16);
  assert.equal(new Set(catalog.map(item => item.id)).size, 16);
  for (const lesson of catalog) {
    const result = valid(lesson.id, lesson.defaults);
    assert.equal(result.diagram.kind, lesson.visual);
    assert.ok(lesson.controls.length > 0);
    assert.ok(lesson.sourceUrl.startsWith('https://'));
    for (const control of lesson.controls) {
      assert.ok(Object.hasOwn(lesson.defaults, control.key));
      assert.ok(control.label);
      const changed = control.type === 'select'
        ? control.options.find(option => String(option.value) !== String(lesson.defaults[control.key])).value
        : lesson.defaults[control.key] === control.min ? control.max : control.min;
      const alternate = evaluateSutra(lesson.id, { ...lesson.defaults, [control.key]: changed });
      assert.ok(alternate.valid || alternate.error);
      assert.notDeepEqual(alternate, result, `${lesson.id}:${control.key} must affect the lesson`);
    }
  }
});

test('01 keeps the final 25 as two place-value digits for every front part', () => {
  assert.equal(valid('01', { a: 3 }).answer, '1225');
  for (let a = 1; a <= 99; a += 1) {
    const result = valid('01', { a });
    assert.equal(result.diagram.result, (10 * a + 5) ** 2);
    assert.equal(result.diagram.right, '25');
  }
});

test('02 uses leading zeros and rejects a zero last digit in the direct complement rule', () => {
  assert.deepEqual(valid('02', { n: 7 }).diagram.digits, [0, 0, 7]);
  assert.equal(valid('02', { n: 997 }).diagram.result, '003');
  for (let n = 1; n < 1000; n += 1) {
    if (n % 10 === 0) assert.equal(evaluateSutra('02', { n }).valid, false);
    else assert.equal(Number(valid('02', { n }).diagram.result), 1000 - n);
  }
});

test('03 carries from both the vertical and crosswise products', () => {
  assert.equal(valid('03', { a: 23, b: 12 }).answer, '276');
  const hard = valid('03', { a: 99, b: 99 }).diagram;
  assert.deepEqual(hard.carry, { ones: 8, tens: 17 });
  assert.deepEqual(hard.digits, { ones: 1, tens: 0, hundreds: 98 });
  for (let a = 10; a <= 99; a += 1) {
    for (let b = 10; b <= 99; b += 1) {
      assert.equal(valid('03', { a, b }).diagram.result, a * b);
    }
  }
});

test('04 preserves exact fractional solutions instead of rounding', () => {
  assert.equal(valid('04', { k: 3, c: 5, r: 20 }).answer, 'x = 5');
  assert.equal(valid('04', { k: 6, c: 4, r: 1 }).answer, 'x = −1/2');
});

test('05 only sets the common group to zero when its coefficients differ', () => {
  assert.equal(valid('05', { a: 9, b: 7, c: 1 }).answer, 'x = −1');
  assert.equal(valid('05', { a: -3, b: 2, c: -4 }).answer, 'x = 4');
  assert.equal(evaluateSutra('05', { a: 2, b: 2, c: 1 }).valid, false);
});

test('06 excludes dependent equations and solves the remaining systems', () => {
  assert.equal(valid('06', { k: 2, q: 9 }).answer, 'x = 3, y = 0');
  assert.equal(valid('06', { k: 4, q: 1 }).answer, 'x = 3, y = 0');
  assert.equal(evaluateSutra('06', { k: 3, q: 9 }).valid, false);
});

test('07 represents half-integer sum/difference solutions exactly', () => {
  assert.equal(valid('07', { s: 10, d: 2 }).answer, 'x = 6, y = 4');
  assert.equal(valid('07', { s: 7, d: -2 }).answer, 'x = 5/2, y = 9/2');
});

test('08 includes both roots, keeping nonsquare radicals exact', () => {
  assert.equal(valid('08', { p: 3, q: 7 }).answer, 'x = 1 또는 −7');
  assert.equal(valid('08', { p: 2, q: 1 }).answer, 'x = −2 + √5 또는 −2 − √5');
  assert.equal(valid('08', { p: 6, q: 72 }).diagram.total, 108);
});

test('09 distinguishes the exact interval slope from the instantaneous slope', () => {
  const result = valid('09', { x: 3, h: 0.01 });
  assert.equal(result.diagram.averageRate, 6.01);
  assert.equal(result.diagram.instantRate, 6);
  assert.equal(result.diagram.change, 0.0601);
  assert.notEqual(result.diagram.change, result.diagram.averageRate);
});

test('10 pads the deficit square to two positions', () => {
  assert.equal(valid('10', { d: 1 }).answer, '9801');
  for (let d = 1; d <= 9; d += 1) {
    const result = valid('10', { d }).diagram;
    assert.equal(result.result, (100 - d) ** 2);
    assert.equal(result.right.length, 2);
  }
});

test('11 shows symmetric cancellation as an explicit teaching extension', () => {
  const result = valid('11', { x: 3, gap: 2 });
  assert.equal(result.diagram.result, 26);
  assert.equal(result.diagram.left, 1);
  assert.equal(result.diagram.right, 5);
  assert.match(result.warning, /교육용 확장/);
});

test('12 preserves leading zero digits and uses the answer last digit, including 1/19', () => {
  const expected = [
    [7, '142857', 7, [3, 2, 6, 4, 5, 1]],
    [13, '076923', 3, [10, 9, 12, 3, 4, 1]],
    [19, '052631578947368421', 1, [10, 5, 12, 6, 3, 11, 15, 17, 18, 9, 14, 7, 13, 16, 8, 4, 2, 1]],
  ];
  for (const [denominator, period, multiplier, remainders] of expected) {
    const diagram = valid('12', { denominator }).diagram;
    assert.equal(diagram.digits.join(''), period);
    assert.equal(diagram.multiplier, multiplier);
    assert.deepEqual(diagram.remainders, remainders);
    assert.deepEqual(diagram.products.map(product => product % 10), diagram.digits);
  }
  assert.equal(evaluateSutra('12', { denominator: 17 }).valid, false);
});

test('13 solves the restricted reciprocal pattern with nonzero exact fractions', () => {
  const first = valid('13', { delta: 1 });
  assert.equal(first.answer, 'x = 2/3');
  assert.deepEqual(first.diagram.values, ['−7/3', '−4/3', '−1/3', '2/3']);
  assert.equal(valid('13', { delta: 5 }).answer, 'x = 10/3');
  for (let delta = 1; delta <= 5; delta += 1) {
    const x = 2 * delta / 3;
    const [A, B, C, D] = [x - 3 * delta, x - 2 * delta, x - delta, x];
    assert.ok(Math.abs(1 / (A * B) + 1 / (A * C) - 1 / (A * D) - 1 / (B * C)) < 1e-12);
    assert.equal(valid('13', { delta }).diagram.delta, delta);
  }
});

test('14 handles both ends of the n times 99 place-value rule', () => {
  assert.equal(valid('14', { n: 1 }).answer, '99');
  assert.equal(valid('14', { n: 100 }).answer, '9900');
  for (let n = 1; n <= 100; n += 1) {
    const diagram = valid('14', { n }).diagram;
    assert.equal(diagram.result, n * 99);
    assert.equal(diagram.right.length, 2);
  }
});

test('15 a false polynomial may pass the coefficient-sum test', () => {
  const correct = valid('15', { a: 2, b: 3, mode: 'correct' }).diagram;
  assert.equal(correct.match, true);
  assert.equal(correct.secondLeft, correct.secondRight);
  assert.equal(valid('15', { a: 2, b: 3, mode: 'wrong' }).diagram.match, false);
  const deceptive = valid('15', { a: 2, b: 3, mode: 'sameSumError' });
  assert.equal(deceptive.diagram.match, true);
  assert.equal(deceptive.diagram.secondLeft, 20);
  assert.equal(deceptive.diagram.secondRight, 19);
  assert.match(deceptive.warning, /증명/);
  assert.equal(evaluateSutra('15', { mode: 'anything' }).valid, false);
});

test('16 separates the derivative of a product from its increase over one unit', () => {
  const diagram = valid('16', { a: 2, b: 3, x: 1 }).diagram;
  assert.equal(diagram.width, 3);
  assert.equal(diagram.height, 4);
  assert.equal(diagram.rate, 7);
  assert.equal(diagram.finiteIncrement, 8);
  for (let a = 1; a <= 8; a += 1) {
    for (let b = 1; b <= 8; b += 1) {
      const result = valid('16', { a, b, x: 8 }).diagram;
      assert.equal(result.finiteIncrement, (9 + a) * (9 + b) - (8 + a) * (8 + b));
    }
  }
});

test('numeric inputs reject nonfinite, blank, nonnumeric and out-of-range values', () => {
  for (const lesson of catalog) {
    for (const control of lesson.controls.filter(item => item.type !== 'select')) {
      for (const bad of [NaN, Infinity, -Infinity, '', ' ', null, true, [], {}, control.min - 1, control.max + 1]) {
        const result = evaluateSutra(lesson.id, { ...lesson.defaults, [control.key]: bad });
        assert.equal(result.valid, false, `${lesson.id}:${control.key}:${String(bad)}`);
        assert.ok(result.error);
      }
      if (control.step === 1) {
        assert.equal(evaluateSutra(lesson.id, { ...lesson.defaults, [control.key]: control.min + 0.5 }).valid, false);
      }
    }
  }
  for (const id of ['99', '__proto__', 'constructor', 'toString', null, {}]) {
    assert.equal(evaluateSutra(id).valid, false);
  }
  assert.equal(evaluateSutra('01', null).valid, false);
  assert.equal(evaluateSutra('01', { a: '3' }).answer, '1225');
});
