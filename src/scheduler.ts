import type { Bot, Context } from 'grammy';
import { Scheduler, post, sendPoll, logger, type CronJob } from 'telegram-broadcast-kit';
import { config } from './config';
import { schedules } from './schedules';
import { formatContextMessage, pollOptions, pollQuestion } from './lib/format';
import { pickQuestion } from './lib/pick';
import { warmupQuestions } from './content/questions-warmup';
import { challengeQuestions } from './content/questions-challenge';
import type { Difficulty, Question } from './types';

// The bot-specific schedule layer. The generic cron plumbing (error
// containment, the node-cron registry) and the channel send/poll wrappers now
// live in telegram-broadcast-kit; this file keeps everything numninjas-specific
// on top of them: which pool to pick, the two-post (context + quiz) dispatch,
// the morning batch order, and the schedule table wiring.

// One Scheduler per bot, holding the live cron tasks so they can all be stopped
// on shutdown. Built lazily on the first startScheduler call.
let scheduler: Scheduler | null = null;

function poolFor(difficulty: Difficulty): readonly Question[] {
  return difficulty === 'warmup' ? warmupQuestions : challengeQuestions;
}

/**
 * Fire one math question. The full flow:
 *   1. pick the question for today's date in the configured timezone
 *   2. post the context message (HTML parse_mode; returns its message_id)
 *   3. post the quiz poll right below it
 * If the context message fails, the poll is skipped, because a lone poll with
 * no scenario above it is useless to the reader.
 *
 * The two posts go out back to back so they read as a pair in the channel feed.
 * (The kit's sendPoll has no reply-to hook, so the poll is no longer a literal
 * reply to the context message; consecutive posting still groups them.)
 */
export async function runQuestion(
  difficulty: Difficulty,
  bot: Bot<Context>,
  opts: { silent?: boolean } = {},
): Promise<void> {
  const pool = poolFor(difficulty);
  const question = pickQuestion(pool, new Date(), config.timezone);

  const contextHtml = formatContextMessage(question);
  // The context message is always silent: it is setup text, and pinging on it
  // would double-buzz the reader. The poll carries the (optional) notification.
  // parseMode 'HTML' is opt-in on the kit's post (the default is plain text).
  const contextId = await post(bot, config.channelChatId, contextHtml, {
    name: question.id,
    silent: true,
    parseMode: 'HTML',
  });

  if (!contextId) {
    logger.warn('Skipping poll because context post failed', { id: question.id });
    return;
  }

  // Quiz poll: Telegram reveals the correct option and the explanation after
  // the reader votes, which is the learn-by-doing loop we want for kids. The
  // kit validates the quiz config synchronously (throws on a bad
  // correctOptionId or an over-long explanation) and clamps the close window.
  await sendPoll(
    bot,
    config.channelChatId,
    {
      question: pollQuestion(),
      options: pollOptions(question),
      type: 'quiz',
      correctOptionId: question.correctIndex,
      explanation: question.explanation,
    },
    { name: question.id, silent: opts.silent ?? false },
  );
}

/**
 * The morning batch, in feed order. Only the last item's poll rings; the
 * warm-up (and every context message) is silent, so a follower gets a single
 * daily notification but still receives both questions. To go fully quiet,
 * set the challenge to `silent: true`; to ping on the warm-up instead, move
 * the `silent: false`. This is the one edit point for the daily ping pattern.
 */
export const dailyBatch: readonly { difficulty: Difficulty; silent: boolean }[] = [
  { difficulty: 'warmup', silent: true },
  { difficulty: 'challenge', silent: false },
];

/**
 * Post the full morning batch in order. They run in sequence (not in
 * parallel) so the channel feed always reads warm-up then challenge, never
 * interleaved, and the one audible poll lands last. A failure on one is
 * logged inside runQuestion and does not stop the next.
 */
export async function runDailyQuestions(bot: Bot<Context>): Promise<void> {
  for (const item of dailyBatch) {
    await runQuestion(item.difficulty, bot, { silent: item.silent });
  }
}

/**
 * Maps each schedule (by name) to the action it fires. This is the bind
 * between the data in schedules.ts and the code here. To add a new fire:
 * add an entry in schedules.ts AND a runner here keyed by the same name.
 * A schedule with no runner is skipped loudly at startup, so a half-done
 * addition fails fast instead of silently double-posting the daily batch.
 * Exported so a unit test can assert every schedule has a runner.
 */
export const runners: Record<string, (bot: Bot<Context>) => Promise<void>> = {
  daily_questions: runDailyQuestions,
};

/**
 * Register every schedule with the kit's Scheduler. The kit validates each
 * cron (an invalid one is logged and skipped, so a single typo never takes the
 * whole bot down) and wraps every fire in runJob for error containment. A
 * schedule with no matching runner is skipped with a logged error. Returns the
 * count registered so /health can report it.
 */
export function startScheduler(bot: Bot<Context>): number {
  scheduler = new Scheduler(config.timezone);
  const jobs: CronJob[] = [];
  for (const s of schedules) {
    const run = runners[s.name];
    if (!run) {
      logger.error('No runner for schedule, skipping', { name: s.name });
      continue;
    }
    jobs.push({
      name: s.name,
      cron: s.cron,
      run: async () => {
        await run(bot);
      },
    });
  }
  return scheduler.start(jobs);
}

export function stopScheduler(): void {
  scheduler?.stop();
  scheduler = null;
}
