import cron from 'node-cron';
import type { Bot } from 'grammy';
import { config } from './config';
import { logger } from './lib/logger';
import { schedules, type ScheduleDef } from './schedules';
import { formatContextMessage, pollOptions, pollQuestion } from './lib/format';
import {
  deleteChannelMessage,
  postContextMessage,
  postQuizPoll,
  postRegularPoll,
} from './lib/post';
import { pickQuestion } from './lib/pick';
import { warmupQuestions } from './content/questions-warmup';
import { challengeQuestions } from './content/questions-challenge';
import { CHECKIN_POLL } from './content/checkin-poll';
import { getMessageId, setMessageId } from './lib/state';
import type { Difficulty, Question } from './types';

const CHECKIN_POLL_SCHEDULE_NAME = 'daily_checkin_poll';

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
 * Fire the daily check-in poll.
 *
 * Order is post-then-delete so the channel is never empty mid-cycle.
 * If the post fails we keep the previous pointer untouched, so the next
 * fire still has something to clean up. If the delete fails we still
 * update the pointer to the new id; the stale poll just ages out by the
 * next fire (Telegram auto-closes after 22h regardless).
 */
export async function runCheckinPoll(bot: Bot): Promise<void> {
  const previousId = getMessageId(CHECKIN_POLL_SCHEDULE_NAME);

  const newId = await postRegularPoll(
    bot,
    {
      question: CHECKIN_POLL.question,
      options: CHECKIN_POLL.options,
      closeAfterHours: CHECKIN_POLL.closeAfterHours,
      allowsMultipleAnswers: false,
    },
    { pollId: CHECKIN_POLL_SCHEDULE_NAME },
  );

  if (newId === null) {
    logger.warn('Check-in poll post failed; keeping previous pointer', { previousId });
    return;
  }

  await setMessageId(CHECKIN_POLL_SCHEDULE_NAME, newId);

  if (previousId !== undefined) {
    await deleteChannelMessage(bot, previousId, { pollId: CHECKIN_POLL_SCHEDULE_NAME });
  }
}

/** Dispatch a schedule by its discriminated kind. */
export async function runSchedule(s: ScheduleDef, bot: Bot): Promise<void> {
  switch (s.kind) {
    case 'question':
      await runQuestion(s.difficulty, bot);
      return;
    case 'checkin_poll':
      await runCheckinPoll(bot);
      return;
  }
}

/**
 * Convenience used by the admin commands and the send-test script to
 * fire a single question on demand.
 */
export async function runOnce(difficulty: Difficulty, bot: Bot): Promise<void> {
  await runQuestion(difficulty, bot);
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
          await runSchedule(s, bot);
        } catch (err) {
          logger.error('Schedule failed', { name: s.name, error: String(err) });
        }
      },
      { timezone: config.timezone },
    );
    registered += 1;
    logger.info('Schedule registered', {
      name: s.name,
      kind: s.kind,
      cron: s.cron,
      timezone: config.timezone,
    });
  }
  return registered;
}
