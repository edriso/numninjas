import type { Question } from '../types';

/**
 * Day-of-year (1..366) for any Date in any IANA timezone, computed by
 * formatting the date in that timezone and then taking the integer day
 * count from Jan 1 of the same year. Pure: no global Date mutation.
 *
 * Used by pickForDay so the channel question on a given calendar day is
 * always the same regardless of when the cron fires inside that day.
 */
export function dayOfYearIn(date: Date, timezone: string): number {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const startOfYear = Date.UTC(year, 0, 1);
  const thisDay = Date.UTC(year, month - 1, day);
  const diffDays = Math.round((thisDay - startOfYear) / 86_400_000);
  return diffDays + 1;
}

/**
 * Deterministic daily picker. The same calendar day always returns the
 * same item, so a redeploy mid-day cannot accidentally re-pick a "new"
 * question for the same slot. The two pools (warm-up, challenge) are
 * picked independently, so they advance independently across the year.
 *
 * Why deterministic and not random: there is no database and no saved
 * state. With ~30 questions per pool the cycle is a full month, which is
 * comfortable for a daily channel. Add more questions and the cycle
 * lengthens on its own.
 */
export function pickForDay<T>(pool: readonly T[], date: Date, timezone: string): T {
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

/** Convenience used by handlers and scripts when they need a Question. */
export function pickQuestion(pool: readonly Question[], date: Date, timezone: string): Question {
  return pickForDay(pool, date, timezone);
}
