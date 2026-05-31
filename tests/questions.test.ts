import { describe, expect, it } from 'vitest';
import { warmupQuestions } from '../src/content/questions-warmup';
import { challengeQuestions } from '../src/content/questions-challenge';
import {
  EXPLANATION_MAX_CHARS,
  MESSAGE_BUDGET_CHARS,
  OPTION_MAX_CHARS,
  QUESTION_MAX_CHARS,
} from '../src/lib/limits';

const allQuestions = [...warmupQuestions, ...challengeQuestions];

describe('question pools', () => {
  it('have content in both pools', () => {
    expect(warmupQuestions.length).toBeGreaterThan(0);
    expect(challengeQuestions.length).toBeGreaterThan(0);
  });

  it('all warm-up ids are unique and prefixed correctly', () => {
    const ids = warmupQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith('warmup-')).toBe(true);
  });

  it('all challenge ids are unique and prefixed correctly', () => {
    const ids = challengeQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith('challenge-')).toBe(true);
  });

  it('ids are unique across both pools combined', () => {
    const ids = allQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every question has exactly four non-empty, distinct options', () => {
    for (const q of allQuestions) {
      expect(q.options.length, q.id).toBe(4);
      for (const opt of q.options) expect(opt.trim().length, q.id).toBeGreaterThan(0);
      expect(new Set(q.options).size, q.id).toBe(4);
    }
  });

  it('option length stays under the Telegram poll-option limit', () => {
    for (const q of allQuestions) {
      for (const opt of q.options) {
        expect(opt.length, `option for ${q.id}: "${opt}"`).toBeLessThanOrEqual(OPTION_MAX_CHARS);
      }
    }
  });

  it('explanation stays under the Telegram quiz-poll limit', () => {
    for (const q of allQuestions) {
      expect(q.explanation.length, q.id).toBeLessThanOrEqual(EXPLANATION_MAX_CHARS);
    }
  });

  it('prompt stays under the question limit', () => {
    for (const q of allQuestions) {
      expect(q.prompt.length, q.id).toBeLessThanOrEqual(QUESTION_MAX_CHARS);
    }
  });

  it('correctIndex is always in range 0..3 and points at a real option', () => {
    for (const q of allQuestions) {
      expect(q.correctIndex, q.id).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex, q.id).toBeLessThanOrEqual(3);
      expect(q.options[q.correctIndex]?.trim().length, q.id).toBeGreaterThan(0);
    }
  });

  it('every question has a topic, scenario, prompt, hint, and explanation', () => {
    for (const q of allQuestions) {
      expect(q.topic.trim().length, q.id).toBeGreaterThan(0);
      expect(q.scenario.trim().length, q.id).toBeGreaterThan(0);
      expect(q.prompt.trim().length, q.id).toBeGreaterThan(0);
      expect(q.hint.trim().length, q.id).toBeGreaterThan(0);
      expect(q.explanation.trim().length, q.id).toBeGreaterThan(0);
    }
  });

  it('prose fields contain no em-dashes or en-dashes', () => {
    for (const q of allQuestions) {
      for (const value of [q.scenario, q.prompt, q.hint, q.explanation]) {
        expect(value.includes('—'), q.id).toBe(false);
        expect(value.includes('–'), q.id).toBe(false);
      }
    }
  });

  it('every question has a sane char budget for rendering', () => {
    for (const q of allQuestions) {
      const total =
        q.scenario.length +
        q.prompt.length +
        q.hint.length +
        q.options.reduce((s, o) => s + o.length, 0);
      expect(total, q.id).toBeLessThanOrEqual(MESSAGE_BUDGET_CHARS);
    }
  });

  it('does not bunch the correct answer in one position', () => {
    for (const pool of [warmupQuestions, challengeQuestions]) {
      const counts = [0, 0, 0, 0];
      for (const q of pool) counts[q.correctIndex] = (counts[q.correctIndex] ?? 0) + 1;
      // Every position should be used at least once, and no single
      // position should hold more than 45% of the answers.
      for (const c of counts) expect(c).toBeGreaterThan(0);
      expect(Math.max(...counts) / pool.length).toBeLessThanOrEqual(0.45);
    }
  });
});
