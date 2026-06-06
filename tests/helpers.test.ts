import { describe, expect, it } from 'vitest';
import { unit, wrongInts } from '../src/content/helpers';

describe('unit', () => {
  it('uses the singular for exactly 1', () => {
    expect(unit(1, 'pound')).toBe('1 pound');
    expect(unit(1, 'sweet')).toBe('1 sweet');
  });

  it('uses the plural for anything other than 1, including 0', () => {
    expect(unit(0, 'sweet')).toBe('0 sweets');
    expect(unit(2, 'pound')).toBe('2 pounds');
    expect(unit(23, 'sticker')).toBe('23 stickers');
  });

  it('honours an explicit irregular plural', () => {
    expect(unit(1, 'child', 'children')).toBe('1 child');
    expect(unit(3, 'child', 'children')).toBe('3 children');
  });
});

describe('wrongInts', () => {
  it('returns three distinct, non-negative integers, none equal to the answer', () => {
    const out = wrongInts(10, [8, 12, 5]);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
    for (const n of out) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).not.toBe(10);
    }
  });

  it('prefers the misconception candidates, in order', () => {
    expect(wrongInts(10, [8, 12, 5])).toEqual([8, 12, 5]);
  });

  it('skips a candidate equal to the correct answer', () => {
    expect(wrongInts(10, [10, 8, 12, 5])).toEqual([8, 12, 5]);
  });

  it('skips negative and duplicate candidates', () => {
    expect(wrongInts(2, [-1, 5, 7])).toEqual([5, 7, 3]); // -1 dropped, then fill 2+1
    expect(wrongInts(10, [8, 8, 12])).toEqual([8, 12, 11]); // dup 8 dropped, then fill 10+1
  });

  it('fills from values stepping out from the answer when candidates run short', () => {
    expect(wrongInts(5, [])).toEqual([6, 4, 7]); // +1, -1, +2
  });

  it('never produces a negative even when the answer is 0', () => {
    const out = wrongInts(0, []);
    expect(new Set(out).size).toBe(3);
    for (const n of out) expect(n).toBeGreaterThanOrEqual(0);
    expect(out).toEqual([1, 2, 3]); // -1 and -2 are skipped as negative
  });
});
