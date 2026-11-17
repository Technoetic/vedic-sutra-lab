const categories = {'전체':'All', '기초':'Foundations', '응용':'Applied', '심화':'Advanced'};
export const categoryName = (category, locale = 'ko') => locale === 'en' ? categories[category] : category;

const english = {
  '01': {
    name: 'Ekādhikena Pūrveṇa', title: 'Ending in 5? Multiply the prefix by its successor',
    summary: 'To square 35, set the 5 aside. Multiply 3 by 4 and put 25 after the product. Try another number ending in 5.',
    tags: ['squares', 'place value', 'ending in 5'], labels: {a:'Digits before the 5'},
    tip: 'Change the leading digits. The last two digits of the square stay 25.',
    condition: 'This works for positive integers ending in 5. Here the digits before the 5 form a number from 1 to 99.'
  },
  '02': {
    name: 'Nikhilaṃ Navataścaramaṃ Daśataḥ', title: 'Subtract from 9, then from 10',
    summary: 'How far is a number from 1000? Write it with three digits, including any leading zeros, and work on one digit at a time.',
    tags: ['subtraction', 'complements', 'place value'], labels: {n:'Number to subtract from 1000'},
    tip: 'Try 7. Reading it as 007 gives 9, 9 and 3: the difference is 993.',
    condition: 'This direct digit rule works here for numbers from 1 to 999 whose final digit is not zero.'
  },
  '03': {
    name: 'Ūrdhva-Tiryagbhyām', title: 'Multiply vertically and crosswise',
    summary: 'Multiply two two-digit numbers in three passes: units, cross products, then tens. Carry as you go.',
    tags: ['multiplication', 'carrying', 'cross products'], labels: {a:'First number',b:'Second number'},
    tip: 'Try 99 × 99 to see a carry in each of the first two passes.',
    condition: 'Both numbers must be integers from 10 to 99. Add the carry from each pass to the next one.'
  },
  '04': {
    name: 'Parāvartya Yojayet', title: 'Keep both sides in balance',
    summary: 'Subtract the same number from both sides. Then divide both sides by the coefficient to leave x on its own.',
    tags: ['equations', 'transposition', 'fractions'], labels: {k:'Coefficient of x',c:'Number added',r:'Right-hand side'},
    tip: 'Try a right-hand side that does not divide evenly after subtraction. The solution stays an exact fraction.',
    condition: 'Start with kx + c = r, with k from 1 to 9. Subtract c from both sides, then divide both sides by the nonzero k.'
  },
  '05': {
    name: 'Śūnyaṃ Sāmyasamuccaye', title: 'Different multiples, one zero factor',
    summary: 'If two different multiples of the same expression are equal, the expression itself must be zero.',
    tags: ['equations', 'common factor', 'conditions'], labels: {a:'Left coefficient',b:'Right coefficient',c:'Number inside the brackets'},
    tip: 'Set the two coefficients equal. Can the equation still pick out a single value of x?',
    condition: 'For a(x + c) = b(x + c), a and b must differ. This example illustrates a particular common-factor interpretation of the sutra.'
  },
  '06': {
    name: 'Ānurūpye Śūnyamanyat', title: 'Match one ratio to isolate the other variable',
    summary: 'Scale the first equation to match the x coefficient and right-hand side of the second. Subtraction leaves only y.',
    tags: ['simultaneous equations', 'ratio', 'elimination'], labels: {k:'Scale factor',q:'Coefficient of y in equation two'},
    tip: 'Set the scale factor to 2 and the second y coefficient to 6. The second equation now repeats the first, scaled up.',
    condition: 'The equations are 2x + 3y = 6 and 2kx + qy = 6k. There is a unique solution only if q ≠ 3k.'
  },
  '07': {
    name: 'Saṅkalana-Vyavakalanābhyām', title: 'Recover two numbers from their sum and difference',
    summary: 'Add two equations to isolate one number. Subtract them to find the other.',
    tags: ['simultaneous equations', 'addition', 'subtraction'], labels: {s:'Sum of the two numbers',d:'Difference of the two numbers'},
    tip: 'When one input is odd and the other even, both answers fall halfway between integers.',
    condition: 'Use x + y = s and x − y = d. In this lab, s and d are integers from −20 to 20.'
  },
  '08': {
    name: 'Pūraṇāpūraṇābhyām', title: 'Fill the missing corner to complete the square',
    summary: 'Fit a square and two strips together. Filling the missing corner turns a quadratic equation into a square you can undo.',
    tags: ['completing the square', 'quadratics', 'area'], labels: {p:'Width of each strip',q:'Right-hand side'},
    tip: 'Add the area of the missing corner to both sides: it is the strip width squared.',
    condition: 'For x² + 2px = q, this lab uses positive p and q. The picture shows the positive root; the algebra gives both roots.'
  },
  '09': {
    name: 'Calana-Kalanābhyām', title: 'Shrink an interval to find the slope at a point',
    summary: 'Watch the slope between two points on a parabola approach the slope at the starting point.',
    tags: ['derivatives', 'rate of change', 'limits'], labels: {x:'Starting point x',h:'Interval width h'},
    tip: 'Reduce h from 1 to 0.01 and watch the gap between the two slopes shrink.',
    condition: 'For f(x) = x², the experiment uses h > 0 so division by h is defined. The instantaneous rate is the limit as h approaches zero.'
  },
  '10': {
    name: 'Yāvadūnam', title: 'Below 100? Subtract the shortfall again',
    summary: 'Square a number just below 100 by splitting the result in two: subtract the shortfall once more, then square the shortfall.',
    tags: ['squares', 'complements', 'near 100'], labels: {d:'Shortfall from 100'},
    tip: 'A shortfall of 1 gives a two-digit ending of 01, not just 1.',
    condition: 'The base is 100. This lab uses 91 through 99 so the square of the shortfall fits into two digits.'
  },
  '11': {
    name: 'Vyaṣṭisamaṣṭiḥ', title: 'Pair two squares around a center',
    summary: 'Square two numbers equally far from the center and add them. Their cross terms have opposite signs and cancel.',
    tags: ['symmetry', 'expansion', 'teaching extension'], labels: {x:'Center',gap:'Distance from the center'},
    tip: 'Change the center x and the distance d independently. Compare the sum with 2x² + 2d².',
    condition: 'This teaching extension uses (x + d)² + (x − d)² = 2x² + 2d². It simplifies the original grouping idea rather than reproducing the original problem.'
  },
  '12': {
    name: 'Śeṣāṇyaṅkena Carameṇa', title: 'Read a decimal from its remainders',
    summary: 'After each division step, multiply the remainder by the last digit of the repeating block. Read the units digit of each product.',
    tags: ['repeating decimals', 'remainders', 'long division'], labels: {denominator:'Fraction to explore'},
    tip: 'For 1/19 the repeating block ends in 1, while the denominator ends in 9. Use the 1.',
    condition: 'The lab covers 1/7, 1/13 and 1/19. The multiplier is the final digit of the repeating answer, not the final digit of the denominator.'
  },
  '13': {
    name: 'Sopāntyadvayamantyam', title: 'The last term plus twice the one before it',
    summary: 'Four equally spaced expressions form a special fraction equation. A relationship between the last two terms gives its solution.',
    tags: ['rational equations', 'arithmetic progression', 'conditions'], labels: {delta:'Common difference'},
    tip: 'Change the common difference. What happens to the solution and the four terms when you double it?',
    condition: 'Use A = x − 3d, B = x − 2d, C = x − d and D = x, with d ≠ 0 and ABCD ≠ 0. The shortcut applies to the particular arrangement of fractions and signs shown.'
  },
  '14': {
    name: 'Ekanyūnena Pūrveṇa', title: 'Multiply by 99 using one less than 100',
    summary: 'Because 99 is one less than 100, the leading part and two-digit ending of the product can be found separately.',
    tags: ['multiplication', '99', 'place value'], labels: {n:'Number to multiply by 99'},
    tip: 'Try 1 and 100 to see what happens at the two ends of the range.',
    condition: 'For integers n from 1 to 100, the leading part is n − 1. Write the ending 100 − n with exactly two digits.'
  },
  '15': {
    name: 'Guṇitasamuccayaḥ', title: 'Check a product using coefficient sums',
    summary: 'Put x = 1 to check the sum of the coefficients in an expansion. Try making a wrong expansion pass that check.',
    tags: ['checks', 'coefficient sums', 'counterexamples'], labels: {a:'Constant in the first factor',b:'Constant in the second factor',mode:'Expansion to check'},
    options: {mode:{correct:'Correct expansion',wrong:'Wrong sum',sameSumError:'Wrong expansion, same sum'}},
    tip: 'Choose “Wrong expansion, same sum.” It passes at x = 1 but fails at x = 2.',
    condition: 'Identical polynomials agree at x = 1. The converse need not hold: a matching coefficient sum does not prove the polynomials are identical.'
  },
  '16': {
    name: 'Guṇakasamuccayaḥ', title: 'When both sides grow, add their lengths',
    summary: 'Let both sides of a rectangle grow at unit speed. The instantaneous growth rate of its area is the sum of its side lengths.',
    tags: ['derivatives', 'product rule', 'area'], labels: {a:'Offset for the width',b:'Offset for the height',x:'Starting point x'},
    tip: 'Compare the instantaneous rate with the area gained in a full unit step: the two differ by 1.',
    condition: 'Here f(x) = (x + a)(x + b): the coefficient of x is 1 in each factor. For general factors use the product rule (uv)′ = u′v + uv′.'
  }
};

export function localizeLessons(lessons, locale = 'ko') {
  if (locale !== 'en') return lessons;
  return lessons.map(lesson => {
    const {labels, options, ...copy} = english[lesson.id];
    const controls = lesson.controls.map(control => ({
      ...control, label: labels[control.key],
      ...(control.options && {options: control.options.map(option => ({
        ...option, label: options?.[control.key]?.[option.value] ?? option.label
      }))})
    }));
    return {...lesson, ...copy, controls, categoryKey: lesson.category, category: categoryName(lesson.category, locale)};
  });
}
