import { describe, expect, it, vi } from 'vitest';
import type { Bot, Context } from 'grammy';
import { runQuestion, runDailyQuestions, dailyBatch } from '../src/scheduler';

/**
 * A minimal fake bot: spies the two methods the dispatch touches — api.sendMessage
 * (the context message) and api.sendPoll (the quiz). No network, no token. We
 * record every call so we can assert the quiz is threaded as a reply to its
 * context message and that the batch silences all but the last poll.
 */
function fakeBot() {
  let nextId = 100;
  const contexts: { id: number; silent: boolean; parseMode?: string }[] = [];
  const polls: { silent: boolean; replyTo?: number }[] = [];
  const api = {
    sendMessage: vi.fn(
      async (
        _chatId: string,
        _text: string,
        extra?: { disable_notification?: boolean; parse_mode?: string },
      ) => {
        const id = nextId++;
        contexts.push({
          id,
          silent: extra?.disable_notification ?? false,
          parseMode: extra?.parse_mode,
        });
        return { message_id: id };
      },
    ),
    sendPoll: vi.fn(
      async (
        _chatId: string,
        _question: string,
        _options: unknown,
        extra: { disable_notification?: boolean; reply_parameters?: { message_id: number } },
      ) => {
        polls.push({
          silent: extra.disable_notification ?? false,
          replyTo: extra.reply_parameters?.message_id,
        });
        return { message_id: nextId++ };
      },
    ),
  };
  return { bot: { api } as unknown as Bot<Context>, contexts, polls };
}

describe('runQuestion', () => {
  it('threads the quiz poll as a reply to its (silent, HTML) context message', async () => {
    const { bot, contexts, polls } = fakeBot();
    await runQuestion('warmup', bot);
    expect(contexts).toHaveLength(1);
    expect(polls).toHaveLength(1);
    // The poll replies to the context message it belongs to (kit replyToMessageId).
    expect(polls[0]?.replyTo).toBe(contexts[0]?.id);
    // The context message is HTML and always silent (the poll carries the ping).
    expect(contexts[0]?.parseMode).toBe('HTML');
    expect(contexts[0]?.silent).toBe(true);
  });

  it('skips the poll when the context message fails (no orphan poll)', async () => {
    const { bot, polls } = fakeBot();
    (
      bot.api.sendMessage as unknown as { mockRejectedValueOnce: (e: Error) => void }
    ).mockRejectedValueOnce(new Error('telegram down'));
    await runQuestion('warmup', bot);
    expect(polls).toHaveLength(0);
  });
});

describe('runDailyQuestions', () => {
  it('posts every question in order, each poll threaded, only the last audible', async () => {
    const { bot, contexts, polls } = fakeBot();
    await runDailyQuestions(bot);
    expect(contexts).toHaveLength(dailyBatch.length);
    expect(polls).toHaveLength(dailyBatch.length);
    // Each poll threads under its own context message, in feed order.
    polls.forEach((p, i) => expect(p.replyTo).toBe(contexts[i]?.id));
    // Single daily ping: every poll but the last is silent.
    const silent = polls.map((p) => p.silent);
    expect(silent.slice(0, -1).every((s) => s === true)).toBe(true);
    expect(silent[silent.length - 1]).toBe(false);
  });
});
