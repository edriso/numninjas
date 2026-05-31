import type { Bot, Context } from 'grammy';
import { config } from '../config';
import { logger } from './logger';

/**
 * Post the context message (HTML parse_mode). Returns the message_id on
 * success so the follow-up poll can reply to it. Returns null on
 * failure: the caller logs and moves on, never throws.
 */
export async function postContextMessage(
  bot: Bot<Context>,
  html: string,
  meta: { questionId?: string } = {},
): Promise<number | null> {
  try {
    const message = await bot.api.sendMessage(config.channelChatId, html, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
    logger.info('Posted context message', {
      questionId: meta.questionId,
      messageId: message.message_id,
    });
    return message.message_id;
  } catch (err) {
    logger.error('Failed to post context message', {
      questionId: meta.questionId,
      error: String(err),
    });
    return null;
  }
}

/** Telegram poll auto-close window, in hours. 5s minimum, ~30d maximum. */
export const MIN_CLOSE_HOURS = 5 / 3600;
export const MAX_CLOSE_HOURS = 2_628_000 / 3600;

/**
 * Post the quiz poll. Quiz polls reveal the correct option and a short
 * explanation after the reader votes, which is exactly the "learn by
 * doing" loop we want for kids. The poll replies to the context message
 * so both items are visually grouped in the channel feed.
 *
 * `closeAfterHours` is clamped into Telegram's accepted window so a bad
 * config can never make the API reject the call.
 */
export async function postQuizPoll(
  bot: Bot<Context>,
  args: {
    question: string;
    options: [string, string, string, string];
    correctOptionId: 0 | 1 | 2 | 3;
    explanation: string;
    closeAfterHours?: number;
    replyToMessageId?: number;
  },
  meta: { questionId?: string } = {},
): Promise<number | null> {
  const requestedHours = args.closeAfterHours ?? 22;
  const clampedHours = Math.min(Math.max(requestedHours, MIN_CLOSE_HOURS), MAX_CLOSE_HOURS);
  const closeDate = Math.floor(Date.now() / 1000) + Math.round(clampedHours * 3600);

  // Bot API 7.3+ expects InputPollOption objects, not plain strings.
  const options = args.options.map((text) => ({ text }));

  try {
    // correct_option_ids is the Bot API 9.x replacement for the old
    // singular correct_option_id field. Quiz polls still have one right
    // answer, but the field is now an array. A single-element array
    // keeps the standard quiz behaviour: one correct answer, reveal on
    // vote.
    const message = await bot.api.sendPoll(config.channelChatId, args.question, options, {
      type: 'quiz',
      correct_option_ids: [args.correctOptionId],
      explanation: args.explanation,
      is_anonymous: true,
      close_date: closeDate,
      ...(args.replyToMessageId
        ? {
            reply_parameters: {
              message_id: args.replyToMessageId,
              allow_sending_without_reply: true,
            },
          }
        : {}),
    });
    logger.info('Posted quiz poll', {
      questionId: meta.questionId,
      messageId: message.message_id,
      correct: args.correctOptionId,
      closeInHours: clampedHours,
    });
    return message.message_id;
  } catch (err) {
    logger.error('Failed to post quiz poll', {
      questionId: meta.questionId,
      error: String(err),
    });
    return null;
  }
}

/**
 * Plain message poster used by /start replies and the welcome script.
 * Separate from postContextMessage so the welcome can use HTML without
 * inheriting "this is the question prelude" semantics from that helper.
 */
export async function postPlainMessage(
  bot: Bot<Context>,
  text: string,
  opts: { parseMode?: 'HTML' } = {},
): Promise<number | null> {
  try {
    const message = await bot.api.sendMessage(config.channelChatId, text, {
      parse_mode: opts.parseMode,
      link_preview_options: { is_disabled: true },
    });
    return message.message_id;
  } catch (err) {
    logger.error('Failed to post plain message', { error: String(err) });
    return null;
  }
}

export async function editChannelMessage(
  bot: Bot<Context>,
  messageId: number,
  text: string,
  opts: { parseMode?: 'HTML' } = {},
): Promise<boolean> {
  try {
    await bot.api.editMessageText(config.channelChatId, messageId, text, {
      parse_mode: opts.parseMode,
      link_preview_options: { is_disabled: true },
    });
    return true;
  } catch (err) {
    logger.warn('Failed to edit channel message', { messageId, error: String(err) });
    return false;
  }
}

/**
 * Post a regular (non-quiz) anonymous poll. Used by the daily check-in
 * poll. Unlike `postQuizPoll`, this is a plain yes/no with no correct
 * answer and no explanation. Anonymous on purpose: nobody, including
 * this bot, learns who voted what.
 */
export async function postRegularPoll(
  bot: Bot<Context>,
  args: {
    question: string;
    options: readonly string[];
    closeAfterHours?: number;
    allowsMultipleAnswers?: boolean;
  },
  meta: { pollId?: string } = {},
): Promise<number | null> {
  const requestedHours = args.closeAfterHours ?? 22;
  const clampedHours = Math.min(Math.max(requestedHours, MIN_CLOSE_HOURS), MAX_CLOSE_HOURS);
  const closeDate = Math.floor(Date.now() / 1000) + Math.round(clampedHours * 3600);

  const options = args.options.map((text) => ({ text }));

  try {
    const message = await bot.api.sendPoll(config.channelChatId, args.question, options, {
      type: 'regular',
      is_anonymous: true,
      allows_multiple_answers: args.allowsMultipleAnswers ?? false,
      close_date: closeDate,
    });
    logger.info('Posted regular poll', {
      pollId: meta.pollId,
      messageId: message.message_id,
      closeInHours: clampedHours,
    });
    return message.message_id;
  } catch (err) {
    logger.error('Failed to post regular poll', {
      pollId: meta.pollId,
      error: String(err),
    });
    return null;
  }
}

/**
 * Delete one previously-posted channel message. Used by the check-in
 * poll replace-on-next-fire flow.
 *
 * Notes / why no throws
 * ─────────────────────
 * Failures here are non-fatal by design. The common case is "the admin
 * already deleted that message by hand". A leaked stale poll is purely
 * cosmetic and self-bounded (the next fire will replace it again).
 *
 * Channel admin rights required
 * ─────────────────────────────
 * In a channel the bot needs the `can_delete_messages` admin right, IN
 * ADDITION to "Post messages". Without it the API returns 400 and we
 * just log it. The 48-hour deleteMessage cap that normally applies to
 * non-admin senders does NOT apply when the bot is a channel admin with
 * this permission. Polls live up to 30 days, so this matters.
 */
export async function deleteChannelMessage(
  bot: Bot<Context>,
  messageId: number,
  meta: { pollId?: string } = {},
): Promise<boolean> {
  try {
    await bot.api.deleteMessage(config.channelChatId, messageId);
    logger.info('Deleted previous channel message', {
      pollId: meta.pollId,
      messageId,
    });
    return true;
  } catch (err) {
    // warn (not error): a missing previous message is the routine case
    // when an admin tidied the channel by hand.
    logger.warn('Failed to delete previous channel message', {
      pollId: meta.pollId,
      messageId,
      error: String(err),
    });
    return false;
  }
}
