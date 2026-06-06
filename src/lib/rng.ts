// A tiny deterministic pseudo-random generator. The whole bot stays no-database
// and restart-safe by NEVER calling Math.random(): every question is generated
// from a seed derived from the calendar day (see generate.ts), so the same day
// always produces exactly the same question, and a redeploy mid-day cannot
// re-roll it. mulberry32 is a well-known, fast 32-bit generator with a full
// 2^32 period, which is far more than we need for picking a few small numbers.

export type Rng = {
  /** Next float in [0, 1). */
  next: () => number;
  /** Integer in [min, max], inclusive of both ends. */
  int: (min: number, max: number) => number;
  /** A uniformly chosen element of a non-empty array. */
  pick: <T>(arr: readonly T[]) => T;
  /** A new array with the elements of `arr` in a uniformly shuffled order. */
  shuffle: <T>(arr: readonly T[]) => T[];
};

/** Build an Rng from a 32-bit integer seed. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => {
    if (max < min) throw new Error(`rng.int: max (${max}) < min (${min})`);
    return min + Math.floor(next() * (max - min + 1));
  };
  const pick = <T>(arr: readonly T[]): T => {
    if (arr.length === 0) throw new Error('rng.pick: empty array');
    return arr[int(0, arr.length - 1)] as T;
  };
  const shuffle = <T>(arr: readonly T[]): T[] => {
    // Fisher-Yates, drawing from the same stream so the result is deterministic.
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  };
  return { next, int, pick, shuffle };
}

/**
 * Fold a list of integers into one 32-bit seed (FNV-1a style). Used to combine
 * the year, day-of-year, a per-difficulty salt, and a retry counter into the
 * single seed that drives a day's generation.
 */
export function seedFrom(...nums: number[]): number {
  let h = 0x811c9dc5;
  for (const n of nums) {
    // Mix each integer byte-by-byte so small inputs still spread across the
    // whole 32-bit space (adjacent days must not produce adjacent seeds).
    let v = n >>> 0;
    for (let b = 0; b < 4; b++) {
      h ^= v & 0xff;
      h = Math.imul(h, 0x01000193);
      v >>>= 8;
    }
  }
  return h >>> 0;
}
