import type { QuestionTemplate } from '../types';
import { unit, wrongInts } from './helpers';

/**
 * Warm-up templates: gentle, single-step skills (adding, subtracting,
 * multiplying, dividing, place value, simple fractions, money, time,
 * measurement, easy geometry). Each `generate` draws this day's numbers from
 * the deterministic rng and returns the answer plus three believable wrong
 * turns; the generator (src/lib/generate.ts) shuffles them into the poll and
 * records where the answer landed.
 *
 * The ranges are chosen so the maths stays friendly AND the answer and
 * distractors are always clean, distinct, and non-negative. Adding a template
 * here adds a new kind of warm-up; the numbers are already infinite.
 */
export const warmupTemplates: readonly QuestionTemplate[] = [
  {
    id: 'warmup-add-two-items',
    difficulty: 'warmup',
    topic: 'Addition',
    generate: (rng) => {
      const a = rng.int(6, 45);
      const b = rng.int(6, 45);
      const total = a + b;
      return {
        topic: 'Addition',
        scenario: 'You stop at the school shop and buy a sandwich and a juice.',
        prompt: `The sandwich costs ${a} pounds and the juice costs ${b} pounds. How much do you pay in total?`,
        hint: 'Add the two prices together.',
        answer: unit(total, 'pound'),
        distractors: wrongInts(total, [Math.abs(a - b), total + 10, total + 1, total - 1]).map(
          (n) => unit(n, 'pound'),
        ) as [string, string, string],
        explanation: `${a} + ${b} = ${total} pounds.`,
      };
    },
  },
  {
    id: 'warmup-subtract-change',
    difficulty: 'warmup',
    topic: 'Subtraction',
    generate: (rng) => {
      const change = rng.int(11, 95);
      const note = rng.pick([100, 200, 300]);
      const bill = note - change;
      return {
        topic: 'Subtraction',
        scenario: `Mum pays for the groceries with a ${note} pound note.`,
        prompt: `The bill is ${bill} pounds. How much change should she get back?`,
        hint: 'Take the bill away from the money she handed over.',
        answer: unit(change, 'pound'),
        distractors: wrongInts(change, [change + 10, change - 10, change + 1, change - 1]).map(
          (n) => unit(n, 'pound'),
        ) as [string, string, string],
        explanation: `${note} - ${bill} = ${change} pounds.`,
      };
    },
  },
  {
    id: 'warmup-multiply-packs',
    difficulty: 'warmup',
    topic: 'Multiplication',
    generate: (rng) => {
      const packs = rng.int(3, 9);
      const per = rng.int(4, 9);
      const total = packs * per;
      return {
        topic: 'Multiplication',
        scenario: 'A teacher hands out pencils for an art class.',
        prompt: `There are ${packs} packs and each pack holds ${per} pencils. How many pencils are there in total?`,
        hint: 'Multiply the number of packs by the pencils in each pack.',
        answer: unit(total, 'pencil'),
        distractors: wrongInts(total, [packs + per, total - per, total + per, total - 1]).map((n) =>
          unit(n, 'pencil'),
        ) as [string, string, string],
        explanation: `${packs} x ${per} = ${total} pencils.`,
      };
    },
  },
  {
    id: 'warmup-divide-share',
    difficulty: 'warmup',
    topic: 'Division',
    generate: (rng) => {
      const per = rng.int(3, 9);
      const friends = rng.int(3, 9);
      const total = per * friends;
      return {
        topic: 'Division',
        scenario: 'You share a sheet of stickers equally with your friends.',
        prompt: `There are ${total} stickers and ${friends} friends. How many stickers does each friend get?`,
        hint: `Split the stickers into ${friends} equal groups.`,
        answer: unit(per, 'sticker'),
        distractors: wrongInts(per, [total - friends, per + 1, per - 1, per + 2]).map((n) =>
          unit(n, 'sticker'),
        ) as [string, string, string],
        explanation: `${total} / ${friends} = ${per} stickers each.`,
      };
    },
  },
  {
    id: 'warmup-divide-remainder',
    difficulty: 'warmup',
    topic: 'Division with Remainders',
    generate: (rng) => {
      const per = rng.int(3, 6);
      const bags = rng.int(4, 8);
      const rem = rng.int(1, per - 1);
      const filled = per * bags;
      const total = filled + rem;
      return {
        topic: 'Division with Remainders',
        scenario: `You put ${total} sweets into small bags, ${per} sweets in each bag.`,
        prompt: 'After filling as many full bags as you can, how many sweets are left over?',
        hint: `How many times does ${per} fit into ${total}, and what is left behind?`,
        answer: unit(rem, 'sweet'),
        distractors: wrongInts(rem, [bags, 0, rem + 1, per - rem]).map((n) => unit(n, 'sweet')) as [
          string,
          string,
          string,
        ],
        explanation: `${per} x ${bags} = ${filled}, and ${total} - ${filled} = ${rem} sweets left over.`,
      };
    },
  },
  {
    id: 'warmup-round-hundred',
    difficulty: 'warmup',
    topic: 'Rounding',
    generate: (rng) => {
      // Avoid an exact multiple of 100 (nothing to round) and an exact x50 (the
      // ambiguous halfway case), so there is one clearly correct answer.
      let n = rng.int(110, 980);
      while (n % 100 === 0 || n % 100 === 50) n = rng.int(110, 980);
      const rounded = Math.round(n / 100) * 100;
      const down = Math.floor(n / 100) * 100;
      const up = Math.ceil(n / 100) * 100;
      return {
        topic: 'Rounding',
        scenario: 'A school rounds a number for a poster.',
        prompt: `What is ${n} rounded to the nearest hundred?`,
        hint: 'Look at the tens digit. Is it 5 or more, or less than 5?',
        answer: `${rounded}`,
        distractors: wrongInts(rounded, [
          rounded === down ? up : down,
          Math.round(n / 10) * 10,
          rounded + 100,
          rounded - 100,
        ]).map((x) => `${x}`) as [string, string, string],
        explanation: `The tens digit decides it, so ${n} rounds to ${rounded}.`,
      };
    },
  },
  {
    id: 'warmup-place-value',
    difficulty: 'warmup',
    topic: 'Place Value',
    generate: (rng) => {
      const place = rng.pick([
        { name: 'thousands', mult: 1000 },
        { name: 'hundreds', mult: 100 },
        { name: 'tens', mult: 10 },
      ]);
      const digit = rng.int(1, 9);
      const th = rng.int(1, 9);
      const h = rng.int(0, 9);
      const t = rng.int(0, 9);
      const o = rng.int(0, 9);
      // Build a 4-digit number, then force the asked place to our chosen digit
      // so the question is never ambiguous.
      const base = { thousands: th, hundreds: h, tens: t };
      if (place.name === 'thousands') base.thousands = digit;
      if (place.name === 'hundreds') base.hundreds = digit;
      if (place.name === 'tens') base.tens = digit;
      const number = base.thousands * 1000 + base.hundreds * 100 + base.tens * 10 + o;
      const value = digit * place.mult;
      return {
        topic: 'Place Value',
        scenario: `A scoreboard shows the number ${number}.`,
        prompt: `What is the value of the ${place.name} digit in ${number}?`,
        hint: 'Which column is the digit sitting in: ones, tens, hundreds, or thousands?',
        answer: `${value}`,
        distractors: wrongInts(value, [digit, digit * 10, digit * 100, digit * 1000]).map(
          (x) => `${x}`,
        ) as [string, string, string],
        explanation: `The ${place.name} digit is ${digit}, so its value is ${value}.`,
      };
    },
  },
  {
    id: 'warmup-multiple-of-5',
    difficulty: 'warmup',
    topic: 'Multiples',
    generate: (rng) => {
      const multiple = rng.int(3, 19) * 5;
      // Three nearby non-multiples of 5.
      const pool = [
        multiple + 1,
        multiple + 2,
        multiple + 3,
        multiple + 4,
        multiple - 1,
        multiple - 2,
        multiple - 3,
        multiple - 4,
      ].filter((x) => x > 0 && x % 5 !== 0);
      const wrong = rng.shuffle(pool).slice(0, 3);
      return {
        topic: 'Multiples',
        scenario: 'A coach lines players up in groups of 5 for a drill.',
        prompt: 'Which of these numbers is a multiple of 5?',
        hint: 'Multiples of 5 always end in 0 or 5.',
        answer: `${multiple}`,
        distractors: [`${wrong[0]}`, `${wrong[1]}`, `${wrong[2]}`],
        explanation: `${multiple} ends in ${multiple % 10}, so it is a multiple of 5.`,
      };
    },
  },
  {
    id: 'warmup-half-of',
    difficulty: 'warmup',
    topic: 'Halving',
    generate: (rng) => {
      const half = rng.int(6, 60);
      const n = half * 2;
      return {
        topic: 'Halving',
        scenario: 'You and your sister share a box of dates equally.',
        prompt: `What is half of ${n}?`,
        hint: 'Halving means splitting into two equal parts.',
        answer: `${half}`,
        distractors: wrongInts(half, [n, half + 1, half - 1, half + 2]).map((x) => `${x}`) as [
          string,
          string,
          string,
        ],
        explanation: `${n} / 2 = ${half}.`,
      };
    },
  },
  {
    id: 'warmup-double',
    difficulty: 'warmup',
    topic: 'Doubling',
    generate: (rng) => {
      const n = rng.int(21, 99);
      const answer = n * 2;
      return {
        topic: 'Doubling',
        scenario: 'A recipe makes some cookies, and you decide to make double for a party.',
        prompt: `What is double ${n}?`,
        hint: 'Double means add the number to itself.',
        answer: `${answer}`,
        distractors: wrongInts(answer, [n + 10, answer - 2, answer + 2, n]).map((x) => `${x}`) as [
          string,
          string,
          string,
        ],
        explanation: `${n} + ${n} = ${answer}.`,
      };
    },
  },
  {
    id: 'warmup-perimeter-square',
    difficulty: 'warmup',
    topic: 'Perimeter',
    generate: (rng) => {
      const side = rng.int(3, 12);
      const per = 4 * side;
      const area = side * side;
      return {
        topic: 'Perimeter',
        scenario: 'You build a square pen for a rabbit with equal sides.',
        prompt: `Each side is ${side} metres long. What is the perimeter (the distance all the way around)?`,
        hint: 'A square has 4 equal sides. Add them all, or multiply one side by 4.',
        answer: `${per} m`,
        distractors: wrongInts(per, [area, 2 * side, 3 * side, per + side]).map(
          (x) => `${x} m`,
        ) as [string, string, string],
        explanation: `4 x ${side} = ${per} metres around. (${area} would be the area.)`,
      };
    },
  },
  {
    id: 'warmup-perimeter-rect',
    difficulty: 'warmup',
    topic: 'Perimeter',
    generate: (rng) => {
      const long = rng.int(5, 15);
      const wide = rng.int(2, long - 1);
      const per = 2 * (long + wide);
      const area = long * wide;
      return {
        topic: 'Perimeter',
        scenario: 'A garden bed is shaped like a rectangle.',
        prompt: `It is ${long} metres long and ${wide} metres wide. What is the perimeter?`,
        hint: 'Add all four sides: two lengths and two widths.',
        answer: `${per} m`,
        distractors: wrongInts(per, [area, long + wide, per + 2, per - 2]).map((x) => `${x} m`) as [
          string,
          string,
          string,
        ],
        explanation: `${long} + ${wide} + ${long} + ${wide} = ${per} metres.`,
      };
    },
  },
  {
    id: 'warmup-cm-to-m',
    difficulty: 'warmup',
    topic: 'Measurement',
    generate: (rng) => {
      const cm = rng.int(12, 45) * 10; // a multiple of 10 cm
      const metres = cm / 100;
      return {
        topic: 'Measurement',
        scenario: 'You measure something long with a tape measure.',
        prompt: `It is ${cm} cm long. How many metres is that?`,
        hint: 'There are 100 cm in 1 metre.',
        answer: `${metres} m`,
        distractors: [`${cm / 10} m`, `${cm} m`, `${cm / 1000} m`],
        explanation: `${cm} / 100 = ${metres} metres.`,
      };
    },
  },
  {
    id: 'warmup-kg-to-g',
    difficulty: 'warmup',
    topic: 'Measurement',
    generate: (rng) => {
      const kg = rng.int(2, 9);
      const g = kg * 1000;
      return {
        topic: 'Measurement',
        scenario: 'A bag of rice is labelled in kilograms at the shop.',
        prompt: `The bag weighs ${kg} kg. How many grams is that?`,
        hint: 'There are 1000 grams in 1 kilogram.',
        answer: `${g} g`,
        distractors: [`${kg * 100} g`, `${kg * 10} g`, `${kg * 10000} g`],
        explanation: `${kg} x 1000 = ${g} grams.`,
      };
    },
  },
  {
    id: 'warmup-time-add',
    difficulty: 'warmup',
    topic: 'Time',
    generate: (rng) => {
      const a = rng.int(25, 55);
      const b = rng.int(35, 55);
      const total = a + b; // 60..110, so always 1 hour and some minutes
      const h = Math.floor(total / 60);
      const m = total % 60;
      const fmt = (hours: number, mins: number) => `${hours} h ${mins} min`;
      return {
        topic: 'Time',
        scenario: 'You spend a while on homework and then some time reading.',
        prompt: `Homework takes ${a} minutes and reading takes ${b} minutes. How much time is that altogether?`,
        hint: 'Add the minutes, then swap 60 minutes for 1 hour.',
        answer: fmt(h, m),
        distractors: [`${total} min`, fmt(h, (m + 10) % 60), fmt(h + 1, m)],
        explanation: `${a} + ${b} = ${total} minutes, which is ${fmt(h, m)}.`,
      };
    },
  },
  {
    id: 'warmup-add-passengers',
    difficulty: 'warmup',
    topic: 'Addition',
    generate: (rng) => {
      const start = rng.int(15, 40);
      const more = rng.int(10, 30);
      const total = start + more;
      return {
        topic: 'Addition',
        scenario: 'A bus picks up people at two stops.',
        prompt: `There were ${start} passengers, then ${more} more got on. How many are on the bus now?`,
        hint: 'Add the people already on the bus to the new ones.',
        answer: `${total}`,
        distractors: wrongInts(total, [
          Math.abs(start - more),
          total + 10,
          total - 1,
          total + 1,
        ]).map((x) => `${x}`) as [string, string, string],
        explanation: `${start} + ${more} = ${total} passengers.`,
      };
    },
  },
];
