import cron from 'node-cron';
import type { Bot } from 'grammy';
import { config } from './config';
import { logger } from './lib/logger';
import { schedules } from './schedules';
import { formatContextMessage, pollOptions, pollQuestion } from './lib/format';
import { postContextMessage, postQuizPoll } from './lib/post';
import { pickQuestion } from './lib/pick';
import { warmupQuestions } from './content/questions-warmup';
import { challengeQuestions } from './content/questions-challenge';
import type { Difficulty, Question } from './types';

function poolFor(difficulty: Difficulty): readonly Question[] {
  return difficulty === 'warmup' ? warmupQuestions : challengeQuestions;
}

/**
 * Fire one math question. The full flow:
 *   1. pick the question for today's date in the configured timezone
 *   2. post the context message (returns its message_id)
 *   3. reply with a quiz poll so the two posts are visually grouped
 * If the context message fails, the poll is skipped, because a lone
 * poll with no scenario above it is useless to the reader.
 */
export async function runQuestion(difficulty: Difficulty, bot: Bot): Promise<void> {
  const pool = poolFor(difficulty);
  const question = pickQuestion(pool, new Date(), config.timezone);

  const contextHtml = formatContextMessage(question);
  const contextId = await postContextMessage(bot, contextHtml, {
    questionId: question.id,
  });

  if (!contextId) {
    logger.warn('Skipping poll because context post failed', { id: question.id });
    return;
  }

  await postQuizPoll(
    bot,
    {
      question: pollQuestion(),
      options: pollOptions(question),
      correctOptionId: question.correctIndex,
      explanation: question.explanation,
      replyToMessageId: contextId,
    },
    { questionId: question.id },
  );
}

/**
 * Post the full morning batch: the warm-up first, then the challenge.
 * They run in sequence (not in parallel) so the channel feed always
 * reads warm-up then challenge, never interleaved. A failure on the
 * warm-up is logged inside runQuestion and does not stop the challenge.
 */
export async function runDailyQuestions(bot: Bot): Promise<void> {
  await runQuestion('warmup', bot);
  await runQuestion('challenge', bot);
}

/**
 * Maps each schedule (by name) to the action it fires. This is the bind
 * between the data in schedules.ts and the code here. To add a new fire:
 * add an entry in schedules.ts AND a runner here keyed by the same name.
 * A schedule with no runner is skipped loudly at startup, so a half-done
 * addition fails fast instead of silently double-posting the daily batch.
 * Exported so a unit test can assert every schedule has a runner.
 */
export const runners: Record<string, (bot: Bot) => Promise<void>> = {
  daily_questions: runDailyQuestions,
};

/**
 * Register every schedule with node-cron. Two things are validated up
 * front and skipped (with a logged error) so one bad schedule never
 * stops the rest: an invalid cron expression, and a schedule with no
 * matching runner. Returns the number registered so /health can report it.
 */
export function startScheduler(bot: Bot): number {
  let registered = 0;
  for (const s of schedules) {
    if (!cron.validate(s.cron)) {
      logger.error('Invalid cron expression, skipping schedule', {
        name: s.name,
        cron: s.cron,
      });
      continue;
    }
    const run = runners[s.name];
    if (!run) {
      logger.error('No runner for schedule, skipping', { name: s.name });
      continue;
    }
    cron.schedule(
      s.cron,
      async () => {
        logger.info('Schedule fired', { name: s.name, cron: s.cron });
        try {
          await run(bot);
        } catch (err) {
          logger.error('Schedule failed', { name: s.name, error: String(err) });
        }
      },
      { timezone: config.timezone },
    );
    registered += 1;
    logger.info('Schedule registered', {
      name: s.name,
      cron: s.cron,
      timezone: config.timezone,
    });
  }
  return registered;
}
