/**
 * Manual dev tool: fire one question into the configured channel right
 * now. Useful for previewing changes to content or formatting without
 * waiting for the daily cron.
 *
 * Usage:
 *   pnpm send-test               -> sends today's warm-up question
 *   pnpm send-test warmup        -> sends today's warm-up question
 *   pnpm send-test challenge     -> sends today's challenge question
 *   pnpm send-test both          -> sends both, warm-up first
 *
 * Requirements: BOT_TOKEN and CHANNEL_CHAT_ID in env (or .env), and the
 * bot must be a channel admin with "Post messages" permission.
 */
import { Bot } from 'grammy';
import { logger } from 'telegram-broadcast-kit';
import { config } from '../src/config';
import { runQuestion } from '../src/scheduler';

async function main(): Promise<void> {
  const arg = (process.argv[2] ?? 'warmup').toLowerCase();
  // Validate the mode BEFORE doing any work, so a typo like
  // "pnpm send-test warmpu" fails fast instead of silently posting
  // nothing (or worse, the wrong question).
  if (!['warmup', 'challenge', 'both'].includes(arg)) {
    console.error(`Unknown mode "${arg}". Use warmup, challenge, or both.`);
    process.exit(1);
  }

  const bot = new Bot(config.botToken);
  // Preflight: catches a bad token or chat id with one clean diagnostic
  // instead of two confusing failures inside runQuestion.
  try {
    const chat = await bot.api.getChat(config.channelChatId);
    logger.info('Channel preflight OK', { title: 'title' in chat ? chat.title : '(private)' });
  } catch (err) {
    logger.error('Channel preflight failed. Check BOT_TOKEN and CHANNEL_CHAT_ID.', {
      error: String(err),
    });
    process.exit(1);
  }

  if (arg === 'warmup' || arg === 'both') {
    await runQuestion('warmup', bot);
  }
  if (arg === 'challenge' || arg === 'both') {
    await runQuestion('challenge', bot);
  }
}

main().catch((err) => {
  logger.error('send-test failed', { error: String(err) });
  process.exit(1);
});
