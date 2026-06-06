// Small helpers shared by the question templates. Kept here so a template reads
// as just its maths, not its plumbing.

/**
 * Format a count with a unit, getting the singular right: unit(1, 'pound') is
 * "1 pound", unit(23, 'pound') is "23 pounds". Pass an explicit plural for
 * irregular words. Units that do not inflect (km, m, g) can be written straight
 * into the string instead.
 */
export function unit(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Build exactly three distinct, non-negative integer distractors for an integer
 * answer. `candidates` are the believable wrong turns (the actual mistakes a
 * kid makes) and are tried first, in order; any that are negative, equal to the
 * answer, or duplicates are skipped. If fewer than three survive, we fill with
 * values stepping out from the answer (answer+1, answer-1, answer+2, ...), so
 * the result is always three usable, distinct numbers.
 */
export function wrongInts(correct: number, candidates: number[]): [number, number, number] {
  const out: number[] = [];
  const seen = new Set<number>([correct]);
  const take = (c: number): void => {
    if (Number.isInteger(c) && c >= 0 && !seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  };
  for (const c of candidates) {
    take(c);
    if (out.length === 3) return [out[0]!, out[1]!, out[2]!];
  }
  for (let step = 1; out.length < 3; step++) {
    take(correct + step);
    if (out.length === 3) break;
    take(correct - step);
  }
  return [out[0]!, out[1]!, out[2]!];
}
