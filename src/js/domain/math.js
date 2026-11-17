import {messagesFor} from '../shared/labText.js';
import {mathMessages} from './mathMessages.js';
// Pure arithmetic only: no DOM, storage, network, or expression evaluation.
const profiles = {
  '01': { defaults: { a: 3 }, rules: { a: [1, 99, 1, 'prefix'] } },
  '02': { defaults: { n: 357 }, rules: { n: [1, 999, 1, 'subtrahend'] } },
  '03': { defaults: { a: 23, b: 12 }, rules: { a: [10, 99, 1, 'firstNumber'], b: [10, 99, 1, 'secondNumber'] } },
  '04': { defaults: { k: 3, c: 5, r: 20 }, rules: { k: [1, 9, 1, 'xCoefficient'], c: [0, 20, 1, 'addend'], r: [1, 100, 1, 'rightSide'] } },
  '05': { defaults: { a: 9, b: 7, c: 1 }, rules: { a: [-9, 9, 1, 'leftCoefficient'], b: [-9, 9, 1, 'rightCoefficient'], c: [-9, 9, 1, 'insideBrackets'] } },
  '06': { defaults: { k: 2, q: 9 }, rules: { k: [1, 4, 1, 'scaleFactor'], q: [1, 20, 1, 'secondYCoefficient'] } },
  '07': { defaults: { s: 10, d: 2 }, rules: { s: [-20, 20, 1, 'sumOfNumbers'], d: [-20, 20, 1, 'differenceOfNumbers'] } },
  '08': { defaults: { p: 3, q: 7 }, rules: { p: [1, 6, 1, 'stripWidth'], q: [1, 72, 1, 'rightSide'] } },
  '09': { defaults: { x: 3, h: 0.1 }, rules: { x: [1, 8, 1, 'startingPoint'], h: [0.01, 1, 0.01, 'changeInInput'] } },
  '10': { defaults: { d: 4 }, rules: { d: [1, 9, 1, 'shortfall'] } },
  '11': { defaults: { x: 3, gap: 1 }, rules: { x: [1, 20, 1, 'center'], gap: [1, 5, 1, 'spacing'] } },
  '12': { defaults: { denominator: 7 }, choices: { denominator: [7, 13, 19] } },
  '13': { defaults: { delta: 1 }, rules: { delta: [1, 5, 1, 'commonDifference'] } },
  '14': { defaults: { n: 27 }, rules: { n: [1, 100, 1, 'factorOf99'] } },
  '15': { defaults: { a: 2, b: 3, mode: 'correct' }, rules: { a: [1, 9, 1, 'firstConstant'], b: [1, 9, 1, 'secondConstant'] }, choices: { mode: ['correct', 'wrong', 'sameSumError'] } },
  '16': { defaults: { a: 2, b: 3, x: 1 }, rules: { a: [1, 8, 1, 'addedWidth'], b: [1, 8, 1, 'addedHeight'], x: [1, 8, 1, 'startingPoint'] } },
};

const clean = value => Number(value.toFixed(12));
const num = value => String(clean(value)).replace('-', '−');
const term = value => value < 0 ? ` − ${num(-value)}` : ` + ${num(value)}`;
const pad = value => String(value).padStart(2, '0');
const step = (title, math, detail) => detail ? { title, math, detail } : { title, math };

function fraction(numerator, denominator = 1) {
  let a = Math.abs(numerator);
  let b = Math.abs(denominator);
  while (b) [a, b] = [b, a % b];
  const divisor = a || 1;
  const sign = denominator < 0 ? -1 : 1;
  const n = numerator / divisor * sign;
  const d = Math.abs(denominator / divisor);
  return d === 1 ? num(n) : `${num(n)}/${d}`;
}

function success(equation, answer, steps, diagram, extra = {}) {
  return { valid: true, equation, answer, steps, diagram, ...extra };
}

function readValues(profile, values, t) {
  const result = { ...profile.defaults };
  for (const [key, rule] of Object.entries(profile.rules || {})) {
    const raw = Object.hasOwn(values, key) ? values[key] : result[key];
    if (!['number', 'string'].includes(typeof raw) || (typeof raw === 'string' && !raw.trim())) {
      return { error: t('numberRequired', t(rule[3])) };
    }
    const value = Number(raw);
    const [min, max, increment, label] = rule;
    if (!Number.isFinite(value) || value < min || value > max ||
        (increment === 1 && !Number.isInteger(value)) ||
        Math.abs((value - min) / increment - Math.round((value - min) / increment)) > 1e-8) {
      return { error: increment === 1 ? t('wholeRange', t(label), min, max) : t('stepRange', t(label), min, max, increment) };
    }
    result[key] = value;
  }
  for (const [key, choices] of Object.entries(profile.choices || {})) {
    const raw = Object.hasOwn(values, key) ? values[key] : result[key];
    const choice = choices.find(value => value === raw || (typeof raw === 'string' && String(value) === raw));
    if (choice === undefined) return { error: t('pickOption') };
    result[key] = choice;
  }
  return result;
}

const calculations = {
  '01': ({ a }, t) => {
    const n = 10 * a + 5;
    const left = a * (a + 1);
    const result = 100 * left + 25;
    return success(`${n}²`, String(result), [
      step(t('multiplyPrefix'), `${a} × ${a + 1} = ${left}`),
      step(t('squareFive'), '5² = 25'),
      step(t('joinTwentyFive'), `${left} | 25 = ${result}`, t('placeValue')),
    ], { kind: 'concat', left, right: '25', n, result }, { insight: '(10a + 5)² = 100a(a + 1) + 25' });
  },
  '02': ({ n }, t) => {
    if (n % 10 === 0) return { valid: false, error: t('zeroLastDigit') };
    const digits = String(n).padStart(3, '0').split('').map(Number);
    const output = digits.map((digit, index) => (index === 2 ? 10 : 9) - digit);
    const result = output.join('');
    return success(`1000 − ${n}`, String(1000 - n), [
      step(t('padThree'), String(n).padStart(3, '0'), t('leadingZero')),
      step(t('subtractNine'), `9 − ${digits[0]} = ${output[0]}, 9 − ${digits[1]} = ${output[1]}`),
      step(t('subtractTen'), `10 − ${digits[2]} = ${output[2]}`),
      step(t('readDigits'), `1000 − ${n} = ${result}`),
    ], { kind: 'complement', digits, upper: 1000, result });
  },
  '03': ({ a, b }, t) => {
    const [at, au, bt, bu] = [Math.floor(a / 10), a % 10, Math.floor(b / 10), b % 10];
    const ones = au * bu;
    const tens = at * bu + au * bt;
    const hundreds = at * bt;
    const carry = { ones: Math.floor(ones / 10), tens: Math.floor((tens + Math.floor(ones / 10)) / 10) };
    const digits = { ones: ones % 10, tens: (tens + carry.ones) % 10, hundreds: hundreds + carry.tens };
    return success(`${a} × ${b}`, String(a * b), [
      step(t('multiplyOnes'), `${au} × ${bu} = ${ones}`, t('carryToTens', digits.ones, carry.ones)),
      step(t('addCrossProducts'), `${at} × ${bu} + ${au} × ${bt} = ${tens}`),
      step(t('carryTens'), `${tens} + ${carry.ones} = ${tens + carry.ones}`, t('carryToHundreds', digits.tens, carry.tens)),
      step(t('combineLeading'), `${at} × ${bt} + ${carry.tens} = ${digits.hundreds}`),
      step(t('combinePlaces'), `${100 * digits.hundreds} + ${10 * digits.tens} + ${digits.ones} = ${a * b}`),
    ], { kind: 'cross', a, b, ones, tens, hundreds, carry, digits, result: a * b });
  },
  '04': ({ k, c, r }, t) => {
    const remainder = r - c;
    const answer = `x = ${fraction(remainder, k)}`;
    const rows = [`${k}x + ${c} = ${r}`, `${k}x = ${num(remainder)}`, answer];
    return success(rows[0], answer, [
      step(t('subtractBoth'), `${k}x + ${c} − ${c} = ${r} − ${c}`),
      step(t('divideBoth'), `${k}x ÷ ${k} = ${num(remainder)} ÷ ${k}`),
      step(t('exactAnswer'), answer),
    ], { kind: 'balance', rows }, { insight: t('balanceInsight') });
  },
  '05': ({ a, b, c }, t) => {
    if (a === b) return { valid: false, error: t('matchingCoefficients') };
    const group = `(x${term(c)})`;
    const answer = `x = ${num(-c)}`;
    const rows = [`${num(a)}${group} = ${num(b)}${group}`, `${num(a - b)}${group} = 0`, `x${term(c)} = 0`, answer];
    return success(rows[0], answer, [
      step(t('subtractCommonGroup'), `${num(a - b)}${group} = 0`),
      step(t('divideNonzero'), `x${term(c)} = 0`, t('canDivide', num(a - b))),
      step(t('solveBrackets'), answer),
    ], { kind: 'balance', rows }, { warning: t('groupCondition') });
  },
  '06': ({ k, q }, t) => {
    if (q === 3 * k) return { valid: false, error: t('dependentEquations') };
    const second = `${2 * k}x + ${q}y = ${6 * k}`;
    const scaled = `${2 * k}x + ${3 * k}y = ${6 * k}`;
    const rows = ['2x + 3y = 6', second, scaled, `${num(q - 3 * k)}y = 0`];
    return success(`2x + 3y = 6, ${second}`, 'x = 3, y = 0', [
      step(t('scaleFirst'), t('scaledEquation', k, scaled)),
      step(t('cancelX'), `${num(q - 3 * k)}y = 0`),
      step(t('substituteY'), 'y = 0, 2x = 6 ⇒ x = 3'),
    ], { kind: 'balance', rows }, { insight: t('proportions') });
  },
  '07': ({ s, d }, t) => {
    const x = fraction(s + d, 2);
    const y = fraction(s - d, 2);
    const rows = [`x + y = ${num(s)}`, `x − y = ${num(d)}`, `2x = ${num(s + d)}`, `2y = ${num(s - d)}`];
    return success(`${rows[0]}, ${rows[1]}`, `x = ${x}, y = ${y}`, [
      step(t('eliminateY'), `2x = ${num(s)} + (${num(d)}) = ${num(s + d)}`),
      step(t('subtractEquations'), `2y = ${num(s)} − (${num(d)}) = ${num(s - d)}`),
      step(t('halveBoth'), `x = ${x}, y = ${y}`),
    ], { kind: 'balance', rows });
  },
  '08': ({ p, q }, t) => {
    const total = q + p * p;
    const root = Math.sqrt(total);
    const answer = Number.isInteger(root)
      ? `x = ${num(-p + root)} ${t('or')} ${num(-p - root)}`
      : `x = −${p} + √${total} ${t('or')} −${p} − √${total}`;
    return success(`x² + ${2 * p}x = ${q}`, answer, [
      step(t('splitStrips'), `${2 * p}x = ${p}x + ${p}x`),
      step(t('fillCorner'), `x² + ${2 * p}x + ${p * p} = ${q} + ${p * p}`),
      step(t('completeSquare'), `(x + ${p})² = ${total}`),
      step(t('positiveNegative'), `x + ${p} = ±${Number.isInteger(root) ? root : `√${total}`}`),
      step(t('twoSolutions'), answer),
    ], { kind: 'square', p, total, side: root, positiveRoot: root - p }, { warning: t('positiveDiagram') });
  },
  '09': ({ x, h }, t) => {
    const instantRate = 2 * x;
    const averageRate = clean(instantRate + h);
    const change = clean(h * averageRate);
    return success(`f(x) = x², x = ${x}, h = ${num(h)}`, t('ratesAnswer', num(averageRate), instantRate), [
      step(t('increaseInput'), `${x} → ${num(x + h)}`),
      step(t('outputChange'), `(${x} + ${num(h)})² − ${x}² = ${num(change)}`),
      step(t('divideChange'), `${num(change)} ÷ ${num(h)} = ${num(averageRate)}`),
      step(t('shrinkStep'), `2 × ${x} + h → ${instantRate}`),
    ], { kind: 'growth', x, h, averageRate, instantRate, change }, { insight: t('approachSlope'), warning: t('differentRates') });
  },
  '10': ({ d }, t) => {
    const n = 100 - d;
    const left = n - d;
    const right = pad(d * d);
    return success(`${n}²`, String(n * n), [
      step(t('findShortfall'), `100 − ${n} = ${d}`),
      step(t('subtractShortfall'), `${n} − ${d} = ${left}`),
      step(t('squareShortfall'), `${d}² = ${right}`),
      step(t('joinPlaces'), `${left} | ${right} = ${n * n}`),
    ], { kind: 'concat', left, right, n, result: n * n }, { insight: '(100 − d)² = 100(100 − 2d) + d²' });
  },
  '11': ({ x, gap }, t) => {
    const result = 2 * x * x + 2 * gap * gap;
    return success(`(${x} + ${gap})² + (${x} − ${gap})²`, String(result), [
      step(t('expandRight'), `(x + ${gap})² = x² + ${2 * gap}x + ${gap * gap}`),
      step(t('expandLeft'), `(x − ${gap})² = x² − ${2 * gap}x + ${gap * gap}`),
      step(t('cancelOpposites'), `+${2 * gap}x − ${2 * gap}x = 0`),
      step(t('substituteCenter'), `2 × ${x}² + 2 × ${gap}² = ${result}`),
    ], { kind: 'symmetric', x, gap, left: x - gap, right: x + gap, result }, { warning: t('adaptedExample') });
  },
  '12': ({ denominator }, t) => {
    let remainder = 1;
    const digits = [];
    const remainders = [];
    do {
      const expanded = remainder * 10;
      digits.push(Math.floor(expanded / denominator));
      remainder = expanded % denominator;
      remainders.push(remainder);
    } while (remainder !== 1);
    const multiplier = digits.at(-1);
    const products = remainders.map(value => value * multiplier);
    const period = digits.join('');
    return success(`1 ÷ ${denominator}`, `0.(${period})`, [
      step(t('longDivision'), `1/${denominator} = 0.${period}…`, t('repeatWithZero')),
      step(t('takeRemainders'), remainders.join(' → ')),
      step(t('multiplyLast'), t('lastProducts', multiplier, products.join(' → '))),
      step(t('readUnits'), digits.join(' → ')),
    ], { kind: 'remainders', denominator, multiplier, digits, remainders, products }, { warning: t('lastDigitCondition') });
  },
  '13': ({ delta }, t) => {
    const x = fraction(2 * delta, 3);
    const labels = [`x − ${3 * delta}`, `x − ${2 * delta}`, `x − ${delta}`, 'x'];
    const values = [-7, -4, -1, 2].map(n => fraction(n * delta, 3));
    return success('1/(AB) + 1/(AC) = 1/(AD) + 1/(BC)', `x = ${x}`, [
      step(t('spaceTerms'), `A = ${labels[0]}, B = ${labels[1]}, C = ${labels[2]}, D = x`),
      step(t('checkDenominators'), `x ≠ 0, ${delta}, ${2 * delta}, ${3 * delta}`),
      step(t('reducePattern'), `D + 2C = 0 ⇒ x + 2(x − ${delta}) = 0`),
      step(t('solveLinear'), `3x = ${2 * delta} ⇒ x = ${x}`),
      step(t('verifyFraction'), t('equalSides', fraction(45, 28 * delta * delta)), t('abProduct')),
    ], { kind: 'progression', delta, labels, values, x }, { warning: t('patternCondition') });
  },
  '14': ({ n }, t) => {
    const left = n - 1;
    const right = pad(100 - n);
    return success(`${n} × 99`, String(n * 99), [
      step(t('oneLessHundred'), `${n} × (100 − 1)`),
      step(t('lowerLeading'), `${n} − 1 = ${left}`),
      step(t('padLastTwo'), `100 − ${n} = ${right}`),
      step(t('joinPlaces'), `${left} | ${right} = ${n * 99}`, t('omitFrontZero')),
    ], { kind: 'concat', left, right, n, result: n * 99 });
  },
  '15': ({ a, b, mode }, t) => {
    const sum = a + b;
    const product = a * b;
    const coefficient = mode === 'wrong' ? sum + 1 : mode === 'sameSumError' ? sum - 1 : sum;
    const constant = mode === 'sameSumError' ? product + 1 : product;
    const left = (1 + a) * (1 + b);
    const right = 1 + coefficient + constant;
    const secondLeft = (2 + a) * (2 + b);
    const secondRight = 4 + 2 * coefficient + constant;
    const match = left === right;
    const equation = `(x + ${a})(x + ${b}) ≟ x² + ${coefficient}x + ${constant}`;
    return success(equation, match ? t('passedSum') : t('mismatchedSum'), [
      step(t('substituteOne'), `(1 + ${a})(1 + ${b}) = ${left}`),
      step(t('sumRightCoefficients'), `1 + ${coefficient} + ${constant} = ${right}`),
      step(t('compareValues'), `${left} ${match ? '=' : '≠'} ${right}`, match ? t('checkPassed') : t('differentPolynomials')),
      step(t('checkTwo'), t('secondChecks', secondLeft, secondRight), mode === 'sameSumError' ? t('secondMismatch') : t('insufficientCheck')),
    ], { kind: 'check', left, right, match, mode, secondLeft, secondRight }, { warning: t('notProof') });
  },
  '16': ({ a, b, x }, t) => {
    const width = x + a;
    const height = x + b;
    const rate = width + height;
    const finiteIncrement = rate + 1;
    return success(`f(x) = (x + ${a})(x + ${b}), x = ${x}`, t('instantAnswer', rate), [
      step(t('currentSides'), t('sizeAndArea', width, height, width * height)),
      step(t('extendSides'), t('areaGain', width, height)),
      step(t('limitOfQuotient'), t('gainOverH', rate, rate)),
      step(t('compareUnit'), `f(${x + 1}) − f(${x}) = ${finiteIncrement}`, t('compareIncrement', rate, finiteIncrement)),
    ], { kind: 'rectangle', width, height, rate, finiteIncrement }, { warning: t('productCondition') });
  },
};

export function evaluateSutra(id, values = {}, language = 'ko') {
  const t = messagesFor(mathMessages, language);
  if (!['string', 'number'].includes(typeof id)) return { valid: false, error: t('unknownSutra') };
  const key = String(id).padStart(2, '0');
  if (!Object.hasOwn(profiles, key)) return { valid: false, error: t('unknownSutra') };
  const profile = profiles[key];
  if (values === null || typeof values !== 'object' || Array.isArray(values)) {
    return { valid: false, error: t('invalidInput') };
  }
  const checked = readValues(profile, values, t);
  return checked.error ? { valid: false, error: checked.error } : calculations[key](checked, t);
}
