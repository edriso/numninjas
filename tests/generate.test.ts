import { describe, expect, it } from 'vitest';
import { dayOfYearIn } from 'telegram-broadcast-kit';
import { generateQuestion } from '../src/lib/generate';
import { questionProblems } from '../src/lib/validate';
import { warmupTemplates } from '../src/content/templates-warmup';
import { challengeTemplates } from '../src/content/templates-challenge';
import type { Difficulty } from '../src/types';

const DAY = 86_400_000;
/** A UTC instant `offset` whole days after 2025-01-01, for sampling days. */
const dayAt = (offset: number) => new Date(Date.UTC(2025, 0, 1) + offset * DAY);

describe('generateQuestion', () => {
  it('is deterministic: the same day and timezone always give the same question', () => {
    const d = new Date('2026-05-28T10:00:00Z');
    for (const difficulty of ['warmup', 'challenge'] as Difficulty[]) {
      expect(generateQuestion(difficulty, d, 'UTC')).toEqual(
        generateQuestion(difficulty, d, 'UTC'),
      );
    }
  });

  it('produces a valid question for every day across two years, both difficulties', () => {
    for (let offset = 0; offset < 366 * 2; offset++) {
      const date = dayAt(offset);
      for (const difficulty of ['warmup', 'challenge'] as Difficulty[]) {
        const q = generateQuestion(difficulty, date, 'UTC');
        expect(questionProblems(q), `${difficulty} day ${offset}: ${q.id}`).toEqual([]);
        expect(q.difficulty).toBe(difficulty);
      }
    }
  });

  it('rotates templates by day-of-year', () => {
    for (let offset = 0; offset < warmupTemplates.length + 3; offset++) {
      const date = dayAt(offset);
      const doy = dayOfYearIn(date, 'UTC');
      const expected = warmupTemplates[(doy - 1) % warmupTemplates.length]!.id;
      expect(generateQuestion('warmup', date, 'UTC').id).toBe(expected);
    }
  });

  it('gives fresh numbers: a year of days yields far more distinct questions than templates', () => {
    // The whole point of generation: the same template recurs (topic rotates),
    // but the numbers differ, so prompts are almost all distinct across a year.
    const prompts = new Set<string>();
    for (let offset = 0; offset < 366; offset++) {
      prompts.add(generateQuestion('warmup', dayAt(offset), 'UTC').prompt);
    }
    expect(prompts.size).toBeGreaterThan(warmupTemplates.length * 5);
  });

  it('differs across years for the same calendar day (no fixed annual question)', () => {
    const jan1of = (year: number) => new Date(Date.UTC(year, 0, 1, 12));
    const ids = new Set<string>();
    const prompts = new Set<string>();
    for (let year = 2026; year < 2026 + 12; year++) {
      const q = generateQuestion('challenge', jan1of(year), 'UTC');
      ids.add(q.id);
      prompts.add(q.prompt);
    }
    expect(ids.size).toBe(1); // same calendar day -> same template every year
    expect(prompts.size).toBeGreaterThan(1); // but the numbers are not annually fixed
  });

  it('spreads the correct answer across all four positions over a year', () => {
    for (const difficulty of ['warmup', 'challenge'] as Difficulty[]) {
      const counts = [0, 0, 0, 0];
      for (let offset = 0; offset < 366; offset++) {
        counts[generateQuestion(difficulty, dayAt(offset), 'UTC').correctIndex]++;
      }
      for (const c of counts) expect(c, `${difficulty} ${counts.join('/')}`).toBeGreaterThan(0);
      expect(Math.max(...counts) / 366).toBeLessThanOrEqual(0.45);
    }
  });

  it('respects the timezone, not the host clock', () => {
    // 2026-02-28 22:30 UTC is still day 59 in UTC but already day 60 in Cairo,
    // so the two can select different templates from the same instant.
    const d = new Date('2026-02-28T22:30:00Z');
    const idFor = (tz: string) => {
      const doy = dayOfYearIn(d, tz);
      return warmupTemplates[(doy - 1) % warmupTemplates.length]!.id;
    };
    expect(generateQuestion('warmup', d, 'UTC').id).toBe(idFor('UTC'));
    expect(generateQuestion('warmup', d, 'Africa/Cairo').id).toBe(idFor('Africa/Cairo'));
  });

  it('keeps the warm-up and challenge number streams independent on the same day', () => {
    // Same day, different difficulty: they must not collapse to the same seed
    // and accidentally mirror each other. (Different template banks already
    // differ, but this guards the per-difficulty salt too.)
    const d = dayAt(0);
    const w = generateQuestion('warmup', d, 'UTC');
    const c = generateQuestion('challenge', d, 'UTC');
    expect(w.prompt).not.toBe(c.prompt);
  });
});
