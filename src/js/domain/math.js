// Pure arithmetic only: no DOM, storage, network, or expression evaluation.
const profiles = {
  '01': { defaults: { a: 3 }, rules: { a: [1, 99, 1, '앞부분'] } },
  '02': { defaults: { n: 357 }, rules: { n: [1, 999, 1, '뺄 수'] } },
  '03': { defaults: { a: 23, b: 12 }, rules: { a: [10, 99, 1, '첫 번째 수'], b: [10, 99, 1, '두 번째 수'] } },
  '04': { defaults: { k: 3, c: 5, r: 20 }, rules: { k: [1, 9, 1, 'x의 계수'], c: [0, 20, 1, '더하는 수'], r: [1, 100, 1, '오른쪽 값'] } },
  '05': { defaults: { a: 9, b: 7, c: 1 }, rules: { a: [-9, 9, 1, '왼쪽 계수'], b: [-9, 9, 1, '오른쪽 계수'], c: [-9, 9, 1, '묶음 안의 수'] } },
  '06': { defaults: { k: 2, q: 9 }, rules: { k: [1, 4, 1, '비교 배수'], q: [1, 20, 1, '두 번째 식의 y 계수'] } },
  '07': { defaults: { s: 10, d: 2 }, rules: { s: [-20, 20, 1, '두 수의 합'], d: [-20, 20, 1, '두 수의 차'] } },
  '08': { defaults: { p: 3, q: 7 }, rules: { p: [1, 6, 1, '띠의 폭'], q: [1, 72, 1, '오른쪽 값'] } },
  '09': { defaults: { x: 3, h: 0.1 }, rules: { x: [1, 8, 1, '출발점 x'], h: [0.01, 1, 0.01, '변화 폭 h'] } },
  '10': { defaults: { d: 4 }, rules: { d: [1, 9, 1, '100에서 모자란 수'] } },
  '11': { defaults: { x: 3, gap: 1 }, rules: { x: [1, 20, 1, '가운데 수'], gap: [1, 5, 1, '양쪽 간격'] } },
  '12': { defaults: { denominator: 7 }, choices: { denominator: [7, 13, 19] } },
  '13': { defaults: { delta: 1 }, rules: { delta: [1, 5, 1, '공차'] } },
  '14': { defaults: { n: 27 }, rules: { n: [1, 100, 1, '99를 곱할 수'] } },
  '15': { defaults: { a: 2, b: 3, mode: 'correct' }, rules: { a: [1, 9, 1, '첫 번째 상수'], b: [1, 9, 1, '두 번째 상수'] }, choices: { mode: ['correct', 'wrong', 'sameSumError'] } },
  '16': { defaults: { a: 2, b: 3, x: 1 }, rules: { a: [1, 8, 1, '가로에 더하는 수'], b: [1, 8, 1, '세로에 더하는 수'], x: [1, 8, 1, '출발점 x'] } },
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

function readValues(profile, values) {
  const result = { ...profile.defaults };
  for (const [key, rule] of Object.entries(profile.rules || {})) {
    const raw = Object.hasOwn(values, key) ? values[key] : result[key];
    if (!['number', 'string'].includes(typeof raw) || (typeof raw === 'string' && !raw.trim())) {
      return { error: `${rule[3]}에는 숫자를 입력해 주세요.` };
    }
    const value = Number(raw);
    const [min, max, increment, label] = rule;
    if (!Number.isFinite(value) || value < min || value > max ||
        (increment === 1 && !Number.isInteger(value)) ||
        Math.abs((value - min) / increment - Math.round((value - min) / increment)) > 1e-8) {
      return { error: `${label}: ${min}부터 ${max}까지 ${increment === 1 ? '정수' : `${increment} 간격의 수`}를 입력해 주세요.` };
    }
    result[key] = value;
  }
  for (const [key, choices] of Object.entries(profile.choices || {})) {
    const raw = Object.hasOwn(values, key) ? values[key] : result[key];
    const choice = choices.find(value => value === raw || (typeof raw === 'string' && String(value) === raw));
    if (choice === undefined) return { error: '목록에 있는 항목을 선택해 주세요.' };
    result[key] = choice;
  }
  return result;
}

const calculations = {
  '01': ({ a }) => {
    const n = 10 * a + 5;
    const left = a * (a + 1);
    const result = 100 * left + 25;
    return success(`${n}²`, String(result), [
      step('앞부분과 다음 수를 곱해요', `${a} × ${a + 1} = ${left}`),
      step('끝의 5를 제곱해요', '5² = 25'),
      step('백의 자리 묶음 뒤에 붙여요', `${left} | 25 = ${result}`, '붙이기는 덧셈이 아니라 100배한 뒤 25를 더하는 자리값 계산입니다.'),
    ], { kind: 'concat', left, right: '25', n, result }, { insight: '(10a + 5)² = 100a(a + 1) + 25' });
  },
  '02': ({ n }) => {
    if (n % 10 === 0) return { valid: false, error: '이 직접 계산은 마지막 자리가 0이 아닐 때 사용합니다. 끝자리가 1~9인 수를 골라 주세요.' };
    const digits = String(n).padStart(3, '0').split('').map(Number);
    const output = digits.map((digit, index) => (index === 2 ? 10 : 9) - digit);
    const result = output.join('');
    return success(`1000 − ${n}`, String(1000 - n), [
      step('세 자리로 맞춰요', String(n).padStart(3, '0'), '앞의 0도 자리를 차지합니다.'),
      step('앞의 두 자리는 9에서 빼요', `9 − ${digits[0]} = ${output[0]}, 9 − ${digits[1]} = ${output[1]}`),
      step('마지막 자리는 10에서 빼요', `10 − ${digits[2]} = ${output[2]}`),
      step('자릿수를 순서대로 읽어요', `1000 − ${n} = ${result}`),
    ], { kind: 'complement', digits, upper: 1000, result });
  },
  '03': ({ a, b }) => {
    const [at, au, bt, bu] = [Math.floor(a / 10), a % 10, Math.floor(b / 10), b % 10];
    const ones = au * bu;
    const tens = at * bu + au * bt;
    const hundreds = at * bt;
    const carry = { ones: Math.floor(ones / 10), tens: Math.floor((tens + Math.floor(ones / 10)) / 10) };
    const digits = { ones: ones % 10, tens: (tens + carry.ones) % 10, hundreds: hundreds + carry.tens };
    return success(`${a} × ${b}`, String(a * b), [
      step('일의 자리끼리 세로로 곱해요', `${au} × ${bu} = ${ones}`, `${digits.ones}을 쓰고 ${carry.ones}을 십의 자리로 올립니다.`),
      step('대각선의 곱을 더해요', `${at} × ${bu} + ${au} × ${bt} = ${tens}`),
      step('올림을 합쳐 십의 자리를 정해요', `${tens} + ${carry.ones} = ${tens + carry.ones}`, `${digits.tens}을 쓰고 ${carry.tens}을 백의 자리 묶음으로 올립니다.`),
      step('앞자리 곱에도 올림을 더해요', `${at} × ${bt} + ${carry.tens} = ${digits.hundreds}`),
      step('자리값을 모아요', `${100 * digits.hundreds} + ${10 * digits.tens} + ${digits.ones} = ${a * b}`),
    ], { kind: 'cross', a, b, ones, tens, hundreds, carry, digits, result: a * b });
  },
  '04': ({ k, c, r }) => {
    const remainder = r - c;
    const answer = `x = ${fraction(remainder, k)}`;
    const rows = [`${k}x + ${c} = ${r}`, `${k}x = ${num(remainder)}`, answer];
    return success(rows[0], answer, [
      step('양쪽에서 같은 수를 빼요', `${k}x + ${c} − ${c} = ${r} − ${c}`),
      step('같은 수로 양쪽을 나눠요', `${k}x ÷ ${k} = ${num(remainder)} ÷ ${k}`),
      step('정확한 값으로 읽어요', answer),
    ], { kind: 'balance', rows }, { insight: '이항은 양쪽에 같은 연산을 해서 등식을 유지하는 과정입니다.' });
  },
  '05': ({ a, b, c }) => {
    if (a === b) return { valid: false, error: '앞의 두 계수가 같으면 모든 x에서 같은 식이 됩니다. 서로 다른 계수를 골라 주세요.' };
    const group = `(x${term(c)})`;
    const answer = `x = ${num(-c)}`;
    const rows = [`${num(a)}${group} = ${num(b)}${group}`, `${num(a - b)}${group} = 0`, `x${term(c)} = 0`, answer];
    return success(rows[0], answer, [
      step('양쪽에서 같은 묶음을 빼요', `${num(a - b)}${group} = 0`),
      step('0이 아닌 계수로 나눠요', `x${term(c)} = 0`, `${num(a - b)}이 0이 아니므로 나눌 수 있습니다.`),
      step('묶음 안의 x를 구해요', answer),
    ], { kind: 'balance', rows }, { warning: '같은 묶음에 서로 다른 계수가 붙은 이 형태에서만 묶음을 0으로 둡니다.' });
  },
  '06': ({ k, q }) => {
    if (q === 3 * k) return { valid: false, error: 'y 계수까지 같은 비율이면 두 식은 같은 조건입니다. y 계수를 바꾸어 독립인 두 식을 만들어 주세요.' };
    const second = `${2 * k}x + ${q}y = ${6 * k}`;
    const scaled = `${2 * k}x + ${3 * k}y = ${6 * k}`;
    const rows = ['2x + 3y = 6', second, scaled, `${num(q - 3 * k)}y = 0`];
    return success(`2x + 3y = 6, ${second}`, 'x = 3, y = 0', [
      step('첫 번째 식을 같은 비율로 키워요', `첫 식 × ${k}: ${scaled}`),
      step('두 식을 빼 x를 없애요', `${num(q - 3 * k)}y = 0`),
      step('y를 구한 뒤 첫 식에 넣어요', 'y = 0, 2x = 6 ⇒ x = 3'),
    ], { kind: 'balance', rows }, { insight: 'x 계수와 오른쪽 값의 비율은 같고, y 계수의 비율은 다릅니다.' });
  },
  '07': ({ s, d }) => {
    const x = fraction(s + d, 2);
    const y = fraction(s - d, 2);
    const rows = [`x + y = ${num(s)}`, `x − y = ${num(d)}`, `2x = ${num(s + d)}`, `2y = ${num(s - d)}`];
    return success(`${rows[0]}, ${rows[1]}`, `x = ${x}, y = ${y}`, [
      step('두 식을 더해 y를 없애요', `2x = ${num(s)} + (${num(d)}) = ${num(s + d)}`),
      step('첫 식에서 둘째 식을 빼요', `2y = ${num(s)} − (${num(d)}) = ${num(s - d)}`),
      step('각각 2로 나눠요', `x = ${x}, y = ${y}`),
    ], { kind: 'balance', rows });
  },
  '08': ({ p, q }) => {
    const total = q + p * p;
    const root = Math.sqrt(total);
    const answer = Number.isInteger(root)
      ? `x = ${num(-p + root)} 또는 ${num(-p - root)}`
      : `x = −${p} + √${total} 또는 −${p} − √${total}`;
    return success(`x² + ${2 * p}x = ${q}`, answer, [
      step('x가 붙은 두 띠로 나눠요', `${2 * p}x = ${p}x + ${p}x`),
      step('빈 모서리만큼 양쪽에 더해요', `x² + ${2 * p}x + ${p * p} = ${q} + ${p * p}`),
      step('정사각형으로 묶어요', `(x + ${p})² = ${total}`),
      step('양수와 음수인 제곱근을 모두 써요', `x + ${p} = ±${Number.isInteger(root) ? root : `√${total}`}`),
      step('두 해를 읽어요', answer),
    ], { kind: 'square', p, total, side: root, positiveRoot: root - p }, { warning: '도형은 양수인 해를 보여 줍니다. 방정식의 해에는 음수인 경우도 포함합니다.' });
  },
  '09': ({ x, h }) => {
    const instantRate = 2 * x;
    const averageRate = clean(instantRate + h);
    const change = clean(h * averageRate);
    return success(`f(x) = x², x = ${x}, h = ${num(h)}`, `구간 변화율 = ${num(averageRate)}, 순간 변화율 = ${instantRate}`, [
      step('입력을 h만큼 늘려요', `${x} → ${num(x + h)}`),
      step('함숫값의 증가량을 구해요', `(${x} + ${num(h)})² − ${x}² = ${num(change)}`),
      step('증가량을 입력의 변화 폭으로 나눠요', `${num(change)} ÷ ${num(h)} = ${num(averageRate)}`),
      step('h를 0에 가깝게 줄여요', `2 × ${x} + h → ${instantRate}`),
    ], { kind: 'growth', x, h, averageRate, instantRate, change }, { insight: 'h를 줄이면 구간 변화율 2x + h가 순간 변화율 2x에 가까워집니다.', warning: '변화량, 구간 변화율, 순간 변화율은 서로 다른 양입니다.' });
  },
  '10': ({ d }) => {
    const n = 100 - d;
    const left = n - d;
    const right = pad(d * d);
    return success(`${n}²`, String(n * n), [
      step('100에서 얼마나 모자라는지 봐요', `100 − ${n} = ${d}`),
      step('원래 수에서 그만큼 한 번 더 빼요', `${n} − ${d} = ${left}`),
      step('모자란 수의 제곱을 두 자리로 써요', `${d}² = ${right}`),
      step('자리값을 붙여요', `${left} | ${right} = ${n * n}`),
    ], { kind: 'concat', left, right, n, result: n * n }, { insight: '(100 − d)² = 100(100 − 2d) + d²' });
  },
  '11': ({ x, gap }) => {
    const result = 2 * x * x + 2 * gap * gap;
    return success(`(${x} + ${gap})² + (${x} − ${gap})²`, String(result), [
      step('오른쪽 수의 제곱을 펼쳐요', `(x + ${gap})² = x² + ${2 * gap}x + ${gap * gap}`),
      step('왼쪽 수의 제곱을 펼쳐요', `(x − ${gap})² = x² − ${2 * gap}x + ${gap * gap}`),
      step('서로 반대인 항을 없애요', `+${2 * gap}x − ${2 * gap}x = 0`),
      step('가운데 수를 넣어요', `2 × ${x}² + 2 × ${gap}² = ${result}`),
    ], { kind: 'symmetric', x, gap, left: x - gap, right: x + gap, result }, { warning: '부분과 전체의 관계를 보여 주는 교육용 확장 예시입니다. 원전의 문제를 그대로 옮긴 것은 아닙니다.' });
  },
  '12': ({ denominator }) => {
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
      step('긴 나눗셈으로 한 주기를 구해요', `1/${denominator} = 0.${period}…`, '앞의 0도 순환마디의 일부입니다. 답의 괄호 안 숫자가 계속 반복됩니다.'),
      step('몫 한 자리를 얻은 직후의 나머지를 모아요', remainders.join(' → ')),
      step('순환마디의 마지막 숫자를 곱해요', `끝자리 ${multiplier}: ${products.join(' → ')}`),
      step('각 곱의 일의 자리만 읽어요', digits.join(' → ')),
    ], { kind: 'remainders', denominator, multiplier, digits, remainders, products }, { warning: '곱하는 수는 소수 답의 순환마디 끝자리입니다. 분모의 끝자리를 쓰는 일반 규칙이 아닙니다.' });
  },
  '13': ({ delta }) => {
    const x = fraction(2 * delta, 3);
    const labels = [`x − ${3 * delta}`, `x − ${2 * delta}`, `x − ${delta}`, 'x'];
    const values = [-7, -4, -1, 2].map(n => fraction(n * delta, 3));
    return success('1/(AB) + 1/(AC) = 1/(AD) + 1/(BC)', `x = ${x}`, [
      step('네 식을 같은 간격으로 놓아요', `A = ${labels[0]}, B = ${labels[1]}, C = ${labels[2]}, D = x`),
      step('0이 아닌 분모 조건을 확인해요', `x ≠ 0, ${delta}, ${2 * delta}, ${3 * delta}`),
      step('이 특별한 배치의 식을 줄여요', `D + 2C = 0 ⇒ x + 2(x − ${delta}) = 0`),
      step('일차방정식을 풀어요', `3x = ${2 * delta} ⇒ x = ${x}`),
      step('원래 분수식의 양쪽을 검산해요', `왼쪽 = 오른쪽 = ${fraction(45, 28 * delta * delta)}`, 'AB는 A × B를 뜻합니다. 구한 값에서 A, B, C, D는 모두 0이 아닙니다.'),
    ], { kind: 'progression', delta, labels, values, x }, { warning: '0이 아닌 공차의 등차수열, 0이 아닌 분모, 표시한 분수식의 배치와 부호가 모두 필요합니다.' });
  },
  '14': ({ n }) => {
    const left = n - 1;
    const right = pad(100 - n);
    return success(`${n} × 99`, String(n * 99), [
      step('99를 100보다 1 작은 수로 봐요', `${n} × (100 − 1)`),
      step('앞부분은 하나 줄여요', `${n} − 1 = ${left}`),
      step('뒷부분은 100에서 빼 두 자리로 써요', `100 − ${n} = ${right}`),
      step('자리값을 붙여요', `${left} | ${right} = ${n * 99}`, '앞부분이 0이면 답의 맨 앞 0은 생략합니다.'),
    ], { kind: 'concat', left, right, n, result: n * 99 });
  },
  '15': ({ a, b, mode }) => {
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
    return success(equation, match ? '계수합 점검 통과' : '계수합이 달라 오류 발견', [
      step('왼쪽에 x = 1을 넣어요', `(1 + ${a})(1 + ${b}) = ${left}`),
      step('오른쪽의 계수를 더해요', `1 + ${coefficient} + ${constant} = ${right}`),
      step('두 값을 비교해요', `${left} ${match ? '=' : '≠'} ${right}`, match ? '이 한 번의 점검은 통과했습니다.' : '값이 다르므로 두 식은 같은 다항식일 수 없습니다.'),
      step('x = 2에서도 비교해 봐요', `왼쪽 ${secondLeft}, 오른쪽 ${secondRight}`, mode === 'sameSumError' ? '합은 같았지만 다른 x에서 어긋났습니다.' : '한 점을 더 확인해도 일반적인 증명을 대신하지는 않습니다.'),
    ], { kind: 'check', left, right, match, mode, secondLeft, secondRight }, { warning: '계수합이 같다는 것은 필요한 조건입니다. 식 전체가 같다는 증명은 아닙니다.' });
  },
  '16': ({ a, b, x }) => {
    const width = x + a;
    const height = x + b;
    const rate = width + height;
    const finiteIncrement = rate + 1;
    return success(`f(x) = (x + ${a})(x + ${b}), x = ${x}`, `순간 변화율 = ${rate}`, [
      step('현재 두 변의 길이를 구해요', `가로 ${width}, 세로 ${height}, 넓이 ${width * height}`),
      step('두 변을 h만큼 함께 늘려요', `넓이 증가 = ${width}h + ${height}h + h²`),
      step('h로 나누고 h를 0에 가깝게 줄여요', `증가량/h = ${rate} + h → ${rate}`),
      step('1만큼 늘릴 때와 비교해요', `f(${x + 1}) − f(${x}) = ${finiteIncrement}`, `순간 변화율 ${rate}과 한 구간의 증가량 ${finiteIncrement}은 다릅니다.`),
    ], { kind: 'rectangle', width, height, rate, finiteIncrement }, { warning: '각 인수의 x 계수가 1이고 두 변이 같은 속도로 늘어나는 형태입니다. 일반적인 곱은 곱의 미분법으로 계산합니다.' });
  },
};

export function evaluateSutra(id, values = {}) {
  if (!['string', 'number'].includes(typeof id)) return { valid: false, error: '수트라 번호를 찾을 수 없습니다.' };
  const key = String(id).padStart(2, '0');
  if (!Object.hasOwn(profiles, key)) return { valid: false, error: '수트라 번호를 찾을 수 없습니다.' };
  const profile = profiles[key];
  if (values === null || typeof values !== 'object' || Array.isArray(values)) {
    return { valid: false, error: '입력값의 형식이 올바르지 않습니다.' };
  }
  const checked = readValues(profile, values);
  return checked.error ? { valid: false, error: checked.error } : calculations[key](checked);
}
