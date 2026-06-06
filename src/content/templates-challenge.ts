import type { QuestionTemplate } from '../types';
import { unit, wrongInts } from './helpers';

/**
 * Challenge templates: a step harder than the warm-up. Multi-step word
 * problems, ratio and proportion, percentages, area, averages, simple "find
 * the number" algebra, powers, fractions of amounts, and speed/distance. Same
 * contract as the warm-up templates (see templates-warmup.ts): draw clean
 * numbers, return the answer plus three believable wrong turns.
 */
export const challengeTemplates: readonly QuestionTemplate[] = [
  {
    id: 'challenge-ratio-share',
    difficulty: 'challenge',
    topic: 'Ratio',
    generate: (rng) => {
      const yours = rng.int(2, 4);
      const theirs = rng.int(2, 4);
      const parts = yours + theirs;
      const each = rng.int(2, 6);
      const total = parts * each;
      const mine = yours * each;
      return {
        topic: 'Ratio',
        scenario: `You and a friend share ${total} sweets in the ratio ${yours} to ${theirs}.`,
        prompt: `You take the ${yours} part of the ratio. How many sweets do you get?`,
        hint: `Add the ratio parts (${yours} + ${theirs}) to find how many equal shares there are.`,
        answer: unit(mine, 'sweet'),
        distractors: wrongInts(mine, [theirs * each, total - mine, mine + each, mine - each]).map(
          (n) => unit(n, 'sweet'),
        ) as [string, string, string],
        explanation: `${parts} equal parts of ${each}, so your ${yours} parts are ${yours} x ${each} = ${mine}.`,
      };
    },
  },
  {
    id: 'challenge-percent-of',
    difficulty: 'challenge',
    topic: 'Percentages',
    generate: (rng) => {
      const pct = rng.pick([10, 20, 50]);
      const base = rng.int(6, 18) * 10; // multiple of 10, keeps pct% a whole number
      const value = (base * pct) / 100;
      return {
        topic: 'Percentages',
        scenario: `A year group has ${base} students, and ${pct}% of them walk to school.`,
        prompt: 'How many students walk to school?',
        hint: `Find 10% of ${base} first, then scale up to ${pct}%.`,
        answer: unit(value, 'student'),
        distractors: wrongInts(value, [base - value, value + 10, value - 10, base / 10]).map((n) =>
          unit(n, 'student'),
        ) as [string, string, string],
        explanation: `${pct}% of ${base} is ${value} students.`,
      };
    },
  },
  {
    id: 'challenge-percent-discount',
    difficulty: 'challenge',
    topic: 'Percentages',
    generate: (rng) => {
      const pct = rng.pick([10, 20, 50]);
      const price = rng.int(6, 40) * 10; // multiple of 10, keeps the discount whole
      const discount = (price * pct) / 100;
      const final = price - discount;
      return {
        topic: 'Percentages',
        scenario: `A shirt costs ${price} pounds and the shop takes ${pct}% off in a sale.`,
        prompt: 'How much do you pay after the discount?',
        hint: `First find ${pct}% of ${price}, then take it off the price.`,
        answer: unit(final, 'pound'),
        distractors: wrongInts(final, [discount, price, final + 10, final - 10]).map((n) =>
          unit(n, 'pound'),
        ) as [string, string, string],
        explanation: `${pct}% of ${price} is ${discount}, so you pay ${price} - ${discount} = ${final} pounds.`,
      };
    },
  },
  {
    id: 'challenge-area-rect',
    difficulty: 'challenge',
    topic: 'Area',
    generate: (rng) => {
      const long = rng.int(4, 12);
      const tall = rng.int(3, 9);
      const area = long * tall;
      const per = 2 * (long + tall);
      return {
        topic: 'Area',
        scenario: 'You are painting a rectangular wall and need its area.',
        prompt: `The wall is ${long} metres long and ${tall} metres tall. What is its area?`,
        hint: 'Area of a rectangle is length times width. Do not add the sides.',
        answer: `${area} sq m`,
        distractors: wrongInts(area, [per, long + tall, area + long, area - tall]).map(
          (x) => `${x} sq m`,
        ) as [string, string, string],
        explanation: `${long} x ${tall} = ${area} square metres. (${per} would be the perimeter.)`,
      };
    },
  },
  {
    id: 'challenge-area-square',
    difficulty: 'challenge',
    topic: 'Area',
    generate: (rng) => {
      const side = rng.int(4, 12);
      const area = side * side;
      const per = 4 * side;
      return {
        topic: 'Area',
        scenario: 'A square rug sits in the middle of a room.',
        prompt: `Each side of the rug is ${side} metres. What is its area?`,
        hint: 'Area of a square is one side multiplied by itself.',
        answer: `${area} sq m`,
        distractors: wrongInts(area, [per, 2 * side, area + side, area - side]).map(
          (x) => `${x} sq m`,
        ) as [string, string, string],
        explanation: `${side} x ${side} = ${area} square metres. (${per} would be the perimeter.)`,
      };
    },
  },
  {
    id: 'challenge-average-four',
    difficulty: 'challenge',
    topic: 'Averages',
    generate: (rng) => {
      const mean = rng.int(6, 8);
      const a = rng.int(1, 2);
      const b = rng.int(0, 2);
      // Four scores that average exactly `mean` and stay in 0..10.
      const scores = [mean + a, mean - a, mean + b, mean - b];
      const sum = scores.reduce((s, x) => s + x, 0); // = 4 * mean
      return {
        topic: 'Averages',
        scenario: `Sara scored ${scores[0]}, ${scores[1]}, ${scores[2]}, and ${scores[3]} in four short quizzes.`,
        prompt: 'What is her average (mean) score?',
        hint: 'Add all four scores, then divide by how many quizzes there were.',
        answer: `${mean}`,
        distractors: wrongInts(mean, [mean + 1, mean - 1, sum, mean + 2]).map((x) => `${x}`) as [
          string,
          string,
          string,
        ],
        explanation: `${scores[0]} + ${scores[1]} + ${scores[2]} + ${scores[3]} = ${sum}, and ${sum} / 4 = ${mean}.`,
      };
    },
  },
  {
    id: 'challenge-find-number-add',
    difficulty: 'challenge',
    topic: 'Find the Number',
    generate: (rng) => {
      const n = rng.int(4, 30);
      const add = rng.int(3, 12);
      const result = n + add;
      return {
        topic: 'Find the Number',
        scenario: `You think of a number, add ${add} to it, and get ${result}.`,
        prompt: 'What was the number you started with?',
        hint: `Undo the "add ${add}" step by subtracting ${add} from ${result}.`,
        answer: `${n}`,
        distractors: wrongInts(n, [result, result + add, add, n + 1]).map((x) => `${x}`) as [
          string,
          string,
          string,
        ],
        explanation: `${result} - ${add} = ${n}, and you can check: ${n} + ${add} = ${result}.`,
      };
    },
  },
  {
    id: 'challenge-find-number-multiply',
    difficulty: 'challenge',
    topic: 'Find the Number',
    generate: (rng) => {
      const n = rng.int(3, 12);
      const groups = rng.int(3, 9);
      const product = n * groups;
      return {
        topic: 'Find the Number',
        scenario: `A box of crayons is shared so that ${groups} equal groups make ${product} crayons.`,
        prompt: 'How many crayons are in each group?',
        hint: `You are looking for the number that, times ${groups}, gives ${product}.`,
        answer: `${n}`,
        distractors: wrongInts(n, [product - groups, n + 1, n - 1, groups]).map((x) => `${x}`) as [
          string,
          string,
          string,
        ],
        explanation: `${product} / ${groups} = ${n}, and you can check: ${groups} x ${n} = ${product}.`,
      };
    },
  },
  {
    id: 'challenge-power-square',
    difficulty: 'challenge',
    topic: 'Powers',
    generate: (rng) => {
      const base = rng.int(4, 12);
      const sq = base * base;
      return {
        topic: 'Powers',
        scenario: `You are tiling a square floor that is ${base} tiles along each side.`,
        prompt: `How many tiles do you need in total (that is ${base} squared)?`,
        hint: `${base} squared means ${base} x ${base}.`,
        answer: `${sq}`,
        distractors: wrongInts(sq, [2 * base, base * (base + 1), base * (base - 1), sq - 1]).map(
          (x) => `${x}`,
        ) as [string, string, string],
        explanation: `${base} x ${base} = ${sq} tiles.`,
      };
    },
  },
  {
    id: 'challenge-multistep-leftover',
    difficulty: 'challenge',
    topic: 'Word Problems',
    generate: (rng) => {
      const start = rng.pick([50, 100]);
      const a = rng.int(8, 20);
      const b = rng.int(5, 20);
      const spent = a + b;
      const left = start - spent;
      return {
        topic: 'Word Problems',
        scenario: `You have ${start} pounds and buy a notebook for ${a} pounds and a pen for ${b} pounds.`,
        prompt: 'How much money do you have left?',
        hint: 'First add up what you spent, then take it away from what you had.',
        answer: unit(left, 'pound'),
        distractors: wrongInts(left, [start - a, start - b, spent, left + 10]).map((n) =>
          unit(n, 'pound'),
        ) as [string, string, string],
        explanation: `${a} + ${b} = ${spent} spent, and ${start} - ${spent} = ${left} pounds left.`,
      };
    },
  },
  {
    id: 'challenge-multistep-change',
    difficulty: 'challenge',
    topic: 'Word Problems',
    generate: (rng) => {
      const count = rng.int(2, 5);
      const price = rng.int(20, 60);
      const cost = count * price;
      const note = (Math.floor(cost / 100) + 1) * 100; // smallest round note over the cost
      const change = note - cost;
      return {
        topic: 'Word Problems',
        scenario: `You buy ${count} toy cars that cost ${price} pounds each and pay with a ${note} pound note.`,
        prompt: 'How much change do you get back?',
        hint: 'Work out the total cost first, then subtract it from what you paid.',
        answer: unit(change, 'pound'),
        distractors: wrongInts(change, [cost, note - price, change + 10, change - 10]).map((n) =>
          unit(n, 'pound'),
        ) as [string, string, string],
        explanation: `${count} x ${price} = ${cost}, and ${note} - ${cost} = ${change} pounds change.`,
      };
    },
  },
  {
    id: 'challenge-fraction-of-amount',
    difficulty: 'challenge',
    topic: 'Fractions of Amounts',
    generate: (rng) => {
      const den = rng.pick([2, 3, 4, 5]);
      const num = rng.int(1, den - 1);
      const each = rng.int(2, 8);
      const total = den * each;
      const value = num * each;
      return {
        topic: 'Fractions of Amounts',
        scenario: `A bag holds ${total} marbles and ${num}/${den} of them are blue.`,
        prompt: 'How many marbles are blue?',
        hint: `Find 1/${den} of ${total} first, then take ${num} of those.`,
        answer: `${value}`,
        distractors: wrongInts(value, [each, total - value, value + each, value - each]).map(
          (x) => `${x}`,
        ) as [string, string, string],
        explanation: `1/${den} of ${total} is ${each}, so ${num}/${den} is ${num} x ${each} = ${value}.`,
      };
    },
  },
  {
    id: 'challenge-speed-distance',
    difficulty: 'challenge',
    topic: 'Speed and Distance',
    generate: (rng) => {
      const speed = rng.pick([40, 50, 60, 70, 80]);
      const time = rng.int(2, 5);
      const dist = speed * time;
      return {
        topic: 'Speed and Distance',
        scenario: `A car drives at a steady ${speed} km per hour for ${time} hours.`,
        prompt: 'How far does the car travel?',
        hint: 'Distance is speed multiplied by time.',
        answer: `${dist} km`,
        distractors: wrongInts(dist, [
          speed + time,
          dist - speed,
          dist + speed,
          Math.round(dist / 2),
        ]).map((x) => `${x} km`) as [string, string, string],
        explanation: `${speed} x ${time} = ${dist} km.`,
      };
    },
  },
  {
    id: 'challenge-speed-time',
    difficulty: 'challenge',
    topic: 'Speed and Distance',
    generate: (rng) => {
      const speed = rng.pick([40, 50, 60]);
      const time = rng.int(2, 5);
      const dist = speed * time;
      return {
        topic: 'Speed and Distance',
        scenario: `A train needs to cover ${dist} km and travels at ${speed} km per hour.`,
        prompt: 'How many hours does the journey take?',
        hint: 'Time is distance divided by speed.',
        answer: unit(time, 'hour'),
        distractors: wrongInts(time, [time + 1, time - 1, time + 2, dist - speed]).map((n) =>
          unit(n, 'hour'),
        ) as [string, string, string],
        explanation: `${dist} / ${speed} = ${time} hours.`,
      };
    },
  },
  {
    id: 'challenge-save-weeks',
    difficulty: 'challenge',
    topic: 'Word Problems',
    generate: (rng) => {
      const per = rng.int(10, 25);
      const weeks = rng.int(4, 10);
      const total = per * weeks;
      return {
        topic: 'Word Problems',
        scenario: `You save ${per} pounds of your pocket money every week for ${weeks} weeks.`,
        prompt: 'How much will you have saved in total?',
        hint: 'Multiply the weekly amount by the number of weeks.',
        answer: unit(total, 'pound'),
        distractors: wrongInts(total, [per + weeks, total - per, total + per, total - weeks]).map(
          (n) => unit(n, 'pound'),
        ) as [string, string, string],
        explanation: `${per} x ${weeks} = ${total} pounds.`,
      };
    },
  },
  {
    id: 'challenge-multiply-stadium',
    difficulty: 'challenge',
    topic: 'Multiplication',
    generate: (rng) => {
      const stands = rng.int(3, 8);
      const seats = rng.pick([1000, 1100, 1200, 1500, 2000]);
      const total = stands * seats;
      return {
        topic: 'Multiplication',
        scenario: `A stadium has ${stands} stands, and each stand seats ${seats} people.`,
        prompt: 'How many people can the stadium hold in total?',
        hint: 'Multiply the number of stands by the seats in one stand.',
        answer: `${total}`,
        distractors: wrongInts(total, [
          stands + seats,
          total - seats,
          total + seats,
          total - 1000,
        ]).map((x) => `${x}`) as [string, string, string],
        explanation: `${stands} x ${seats} = ${total} people.`,
      };
    },
  },
];
