import { config } from './config';

/**
 * A schedule is just a named cron expression. The bot has one daily
 * fire, so the list has a single entry, but keeping it a list means
 * adding another fire later (a weekend brain teaser, say) is a one-line
 * change here plus its runner in scheduler.ts.
 */
export type ScheduleDef = { name: string; cron: string };

/**
 * The one daily fire. Default 07:00 in the configured timezone. At this
 * time the bot posts the warm-up question first and then the challenge,
 * back to back (see scheduler.ts#runDailyQuestions). Override the time
 * via the DAILY_CRON env var.
 *
 * Why morning only: kids do best with short, frequent practice, and a
 * single early session rewards waking up early while posting nothing at
 * night, so the channel never competes with bedtime. See docs/QUESTIONS.md.
 */
export const schedules: readonly ScheduleDef[] = [
  { name: 'daily_questions', cron: config.dailyCron },
];
