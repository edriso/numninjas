import { describe, expect, it } from 'vitest';
import { dayOfYearIn, pickForDay } from '../src/lib/pick';

describe('dayOfYearIn', () => {
  it('returns 1 for January 1 in UTC', () => {
    expect(dayOfYearIn(new Date('2026-01-01T12:00:00Z'), 'UTC')).toBe(1);
  });

  it('returns 365 for December 31 in a non-leap year (UTC)', () => {
    expect(dayOfYearIn(new Date('2026-12-31T12:00:00Z'), 'UTC')).toBe(365);
  });

  it('returns 366 for December 31 in a leap year (UTC)', () => {
    expect(dayOfYearIn(new Date('2024-12-31T12:00:00Z'), 'UTC')).toBe(366);
  });

  it('respects the timezone, not the host TZ', () => {
    // 2026-03-01 00:30 Africa/Cairo is still Feb 28 in UTC, but in Cairo
    // it is day 60 of the year. The function must report the Cairo day.
    const d = new Date('2026-02-28T22:30:00Z');
    expect(dayOfYearIn(d, 'Africa/Cairo')).toBe(60);
    expect(dayOfYearIn(d, 'UTC')).toBe(59);
  });

  it('counts the leap day (Feb 29 is day 60 in a leap year)', () => {
    expect(dayOfYearIn(new Date('2024-02-29T12:00:00Z'), 'UTC')).toBe(60);
  });
});

describe('pickForDay', () => {
  it('picks the same item for the same day', () => {
    const pool = ['a', 'b', 'c', 'd'];
    const d = new Date('2026-05-28T10:00:00Z');
    expect(pickForDay(pool, d, 'UTC')).toBe(pickForDay(pool, d, 'UTC'));
  });

  it('cycles through the pool as days advance', () => {
    const pool = ['a', 'b', 'c'];
    const day1 = pickForDay(pool, new Date('2026-01-01T00:00:00Z'), 'UTC');
    const day2 = pickForDay(pool, new Date('2026-01-02T00:00:00Z'), 'UTC');
    const day3 = pickForDay(pool, new Date('2026-01-03T00:00:00Z'), 'UTC');
    const day4 = pickForDay(pool, new Date('2026-01-04T00:00:00Z'), 'UTC');
    expect([day1, day2, day3]).toEqual(['a', 'b', 'c']);
    expect(day4).toBe('a');
  });

  it('wraps around when the day-of-year exceeds the pool length', () => {
    // Pool of 3, day 4 (2026-01-04) -> (4-1) % 3 = 0 -> first item again.
    const pool = ['a', 'b', 'c'];
    expect(pickForDay(pool, new Date('2026-01-04T00:00:00Z'), 'UTC')).toBe('a');
    // Day 7 -> (7-1) % 3 = 0 -> first item, a full two cycles in.
    expect(pickForDay(pool, new Date('2026-01-07T00:00:00Z'), 'UTC')).toBe('a');
  });

  it('throws on empty pool', () => {
    expect(() => pickForDay([], new Date(), 'UTC')).toThrowError();
  });
});
