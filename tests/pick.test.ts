import { describe, expect, it } from 'vitest';
import { pickQuestion } from '../src/lib/pick';
import type { Question } from '../src/types';

// dayOfYearIn (the timezone-safe day math) now lives in telegram-broadcast-kit
// and is tested there. pickQuestion is the numninjas-specific typed rotation
// over Question objects (the kit's pickForDay only rotates strings), so its
// deterministic daily behaviour is pinned here.

function q(id: string): Question {
  return {
    id,
    difficulty: 'warmup',
    topic: 'T',
    scenario: 'S',
    prompt: 'P',
    hint: 'H',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 0,
    explanation: 'E',
  };
}

describe('pickQuestion', () => {
  const pool = [q('one'), q('two'), q('three')];

  it('picks the same item for the same day', () => {
    const d = new Date('2026-05-28T10:00:00Z');
    expect(pickQuestion(pool, d, 'UTC')).toBe(pickQuestion(pool, d, 'UTC'));
  });

  it('cycles through the pool as days advance', () => {
    const day1 = pickQuestion(pool, new Date('2026-01-01T00:00:00Z'), 'UTC');
    const day2 = pickQuestion(pool, new Date('2026-01-02T00:00:00Z'), 'UTC');
    const day3 = pickQuestion(pool, new Date('2026-01-03T00:00:00Z'), 'UTC');
    const day4 = pickQuestion(pool, new Date('2026-01-04T00:00:00Z'), 'UTC');
    expect([day1.id, day2.id, day3.id]).toEqual(['one', 'two', 'three']);
    expect(day4.id).toBe('one');
  });

  it('respects the timezone, not the host clock', () => {
    // 2026-02-28 22:30 UTC is still Feb 28 (day 59) in UTC, but already
    // 2026-03-01 (day 60) in Cairo, so the two timezones can pick different
    // items from the same instant.
    const d = new Date('2026-02-28T22:30:00Z');
    const cairo = pickQuestion(pool, d, 'Africa/Cairo');
    const utc = pickQuestion(pool, d, 'UTC');
    // day 60 -> (60-1)%3 = 2 -> 'three'; day 59 -> (59-1)%3 = 1 -> 'two'.
    expect(cairo.id).toBe('three');
    expect(utc.id).toBe('two');
  });

  it('throws on an empty pool', () => {
    expect(() => pickQuestion([], new Date(), 'UTC')).toThrowError();
  });
});
