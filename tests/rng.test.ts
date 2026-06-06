import { describe, expect, it } from 'vitest';
import { mulberry32, seedFrom } from '../src/lib/rng';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 8 }, () => a.next());
    const seqB = Array.from({ length: 8 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs between adjacent seeds', () => {
    expect(mulberry32(1).next()).not.toBe(mulberry32(2).next());
  });

  it('int(min, max) stays in range, inclusive of both ends', () => {
    const rng = mulberry32(99);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7]);
  });

  it('int(min, max) returns min when the range is a single value', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 100; i++) expect(rng.int(5, 5)).toBe(5);
  });

  it('int throws when max is below min (a programming error)', () => {
    expect(() => mulberry32(1).int(7, 3)).toThrowError();
  });

  it('pick returns an element and shuffle is a permutation', () => {
    const rng = mulberry32(7);
    const arr = ['a', 'b', 'c', 'd'];
    expect(arr).toContain(rng.pick(arr));
    const shuffled = rng.shuffle(arr);
    expect(shuffled).toHaveLength(arr.length);
    expect([...shuffled].sort()).toEqual([...arr].sort());
    expect(arr).toEqual(['a', 'b', 'c', 'd']); // shuffle does not mutate input
  });

  it('pick throws on an empty array; shuffle of an empty array is empty', () => {
    const rng = mulberry32(7);
    expect(() => rng.pick([])).toThrowError();
    expect(rng.shuffle([])).toEqual([]);
  });

  it('shuffle of a single element returns that element', () => {
    expect(mulberry32(7).shuffle(['only'])).toEqual(['only']);
  });
});

describe('seedFrom', () => {
  it('is order-sensitive and adjacent-input-sensitive', () => {
    expect(seedFrom(1, 2, 3)).toBe(seedFrom(1, 2, 3));
    expect(seedFrom(1, 2, 3)).not.toBe(seedFrom(3, 2, 1));
    // Adjacent days/years must not produce near-identical seeds.
    expect(seedFrom(2026, 1, 0)).not.toBe(seedFrom(2026, 2, 0));
    expect(seedFrom(2026, 1, 0)).not.toBe(seedFrom(2027, 1, 0));
  });
});
