import { describe, expect, it } from 'vitest';
import { isValidQuestion, questionProblems } from '../src/lib/validate';
import type { Question } from '../src/types';

// A known-good warm-up question; each test mutates one field to confirm the
// validator catches exactly that flaw. This is the net the generator relies on
// to re-roll a bad draw, so it must reject every shape a template could slip.
const base: Question = {
  id: 'warmup-x',
  difficulty: 'warmup',
  topic: 'Topic',
  scenario: 'A short scenario.',
  prompt: 'What is the answer?',
  hint: 'A gentle nudge.',
  options: ['10', '20', '30', '40'],
  correctIndex: 0,
  explanation: '10 is the answer.',
};

const has = (q: Question, needle: string) => questionProblems(q).some((p) => p.includes(needle));

describe('questionProblems', () => {
  it('returns no problems for a well-formed question', () => {
    expect(questionProblems(base)).toEqual([]);
    expect(isValidQuestion(base)).toBe(true);
  });

  it('accepts a well-formed challenge question', () => {
    expect(questionProblems({ ...base, difficulty: 'challenge', id: 'challenge-x' })).toEqual([]);
  });

  it('flags an id whose prefix does not match the difficulty', () => {
    expect(has({ ...base, id: 'challenge-x' }, 'warmup-')).toBe(true);
    expect(has({ ...base, difficulty: 'challenge', id: 'warmup-x' }, 'challenge-')).toBe(true);
  });

  it('flags the wrong number of options', () => {
    expect(
      has({ ...base, options: ['a', 'b', 'c'] as unknown as Question['options'] }, '4 options'),
    ).toBe(true);
  });

  it('flags duplicate options', () => {
    expect(has({ ...base, options: ['10', '10', '30', '40'] }, 'different')).toBe(true);
  });

  it('flags an empty option', () => {
    expect(has({ ...base, options: ['10', '', '30', '40'] }, 'options[1] is empty')).toBe(true);
  });

  it('flags an option over the 100-char poll limit', () => {
    expect(has({ ...base, options: ['10', 'x'.repeat(101), '30', '40'] }, '> 100')).toBe(true);
  });

  it('flags a correctIndex out of range', () => {
    expect(has({ ...base, correctIndex: 4 as Question['correctIndex'] }, 'out of range')).toBe(
      true,
    );
    expect(has({ ...base, correctIndex: -1 as Question['correctIndex'] }, 'out of range')).toBe(
      true,
    );
  });

  it('flags an explanation over the 200-char limit', () => {
    expect(has({ ...base, explanation: 'x'.repeat(201) }, 'explanation length')).toBe(true);
  });

  it('flags a prompt over the 300-char limit', () => {
    expect(has({ ...base, prompt: 'x'.repeat(301) }, 'prompt length')).toBe(true);
  });

  it('flags em-dashes and en-dashes in prose', () => {
    expect(has({ ...base, scenario: 'a — b' }, 'em-dash')).toBe(true);
    expect(has({ ...base, hint: 'a – b' }, 'em-dash')).toBe(true);
  });

  it('flags empty prose fields', () => {
    expect(has({ ...base, scenario: '   ' }, 'scenario is empty')).toBe(true);
    expect(has({ ...base, hint: '' }, 'hint is empty')).toBe(true);
  });

  it('flags a question that blows the render budget', () => {
    expect(has({ ...base, scenario: 'x'.repeat(2001) }, 'total text')).toBe(true);
  });

  it('reports multiple problems at once', () => {
    const broken: Question = { ...base, id: 'nope-1', options: ['a', 'a', '', '40'] };
    expect(questionProblems(broken).length).toBeGreaterThanOrEqual(2);
    expect(isValidQuestion(broken)).toBe(false);
  });
});
