import { dayOfYearIn } from 'telegram-broadcast-kit';
import type { Question } from '../types';

// The kit's pickForDay rotates over a string (or string pool) — perfect for a
// text reminder, but numninjas rotates over Question OBJECTS, so the kit's
// string-typed picker does not fit. We reuse the kit's timezone-safe
// dayOfYearIn (the part that is genuinely shared) and keep the typed,
// object-aware rotation here.

/**
 * Deterministic daily picker for Question objects. The same calendar day
 * always returns the same item, so a redeploy mid-day cannot accidentally
 * re-pick a "new" question for the same slot. The two pools (warm-up,
 * challenge) are picked independently, so they advance independently across
 * the year.
 *
 * Why deterministic and not random: there is no database and no saved state.
 * With ~30 questions per pool the cycle is a full month, comfortable for a
 * daily channel. Add more questions and the cycle lengthens on its own.
 */
export function pickQuestion(pool: readonly Question[], date: Date, timezone: string): Question {
  if (pool.length === 0) {
    throw new Error('Cannot pick from empty pool');
  }
  const doy = dayOfYearIn(date, timezone);
  const item = pool[(doy - 1) % pool.length];
  if (!item) {
    throw new Error('Internal: picker returned undefined');
  }
  return item;
}
