import { config } from './config';
import type { Difficulty } from './types';

/**
 * Schedules are a discriminated union on `kind`. Adding a new kind is a
 * one-line change in scheduler.ts (see the switch in `runSchedule`).
 *
 *  - kind 'question'     : pick a question from the warm-up or challenge
 *                          pool and post the context message plus a quiz
 *                          poll.
 *  - kind 'checkin_poll' : post the daily anonymous "did you practice
 *                          some math today" yes/no poll. The fire deletes
 *                          the previous poll so only one is live at a
 *                          time.
 */
export type ScheduleDef =
  | { kind: 'question'; name: string; cron: string; difficulty: Difficulty }
  | { kind: 'checkin_poll'; name: string; cron: string };

/**
 * The three daily fires. Defaults are 15:00 (warm-up, after school),
 * 17:30 (check-in poll), and 19:30 (evening challenge) in the configured
 * timezone. Override any cron via env: WARMUP_CRON, CHECKIN_POLL_CRON,
 * CHALLENGE_CRON.
 *
 * Why this spread: research on kids aged 10 to 12 favours "little and
 * often" over one long block. Two quick 30-second questions, one gentle
 * in the afternoon and one tougher in the evening, with a friendly
 * check-in nudge between them, fits a 15 to 20 minute daily habit
 * without overwhelming a young reader. See docs/QUESTIONS.md.
 */
export const schedules: readonly ScheduleDef[] = [
  { kind: 'question', name: 'daily_warmup', cron: config.warmupCron, difficulty: 'warmup' },
  { kind: 'checkin_poll', name: 'daily_checkin_poll', cron: config.checkinPollCron },
  { kind: 'question', name: 'daily_challenge', cron: config.challengeCron, difficulty: 'challenge' },
];
