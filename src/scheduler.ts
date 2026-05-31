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
 * Register every schedule with node-cron. Bad cron expressions are
 * validated up front: an invalid one is logged and skipped so the rest
 * of the bot still runs. Returns the number registered so /health can
 * report it.
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
    cron.schedule(
      s.cron,
      async () => {
        logger.info('Schedule fired', { name: s.name, cron: s.cron });
        try {
          await runDailyQuestions(bot);
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
