import { Bot } from 'grammy';
import { config } from './config';
import { logger } from './lib/logger';
import { runCheckinPoll, runOnce } from './scheduler';

/**
 * Build and configure the Grammy bot. The bot exists mainly to drive
 * the scheduled channel posts. The DM surface is intentionally minimal:
 * a /start that points new arrivals to the channel, and optional admin
 * commands that fire a schedule on demand for debugging.
 */
export function buildBot(): Bot {
  const bot = new Bot(config.botToken);

  bot.command('start', async (ctx) => {
    const link = config.channelUrl;
    const tail = link ? `\n\nJoin the channel: ${link}` : '';
    await ctx.reply(
      [
        '👋 Hi ninja! NumNinjas posts two short math puzzles a day to its Telegram channel.',
        '',
        'A warm-up in the afternoon and a tougher challenge in the evening. Each one is a quick real-life story with a hint and a quiz, so you can check yourself in seconds.',
        tail,
      ].join('\n'),
      { link_preview_options: { is_disabled: true } },
    );
  });

  bot.command('about', async (ctx) => {
    await ctx.reply(
      [
        'NumNinjas is a tiny open-source Telegram bot that posts daily math puzzles for kids aged 10 to 12 to a channel.',
        'It has no database. Questions live in the source.',
      ].join('\n'),
    );
  });

  // Admin-only manual fire. Useful when you want to preview the next
  // question without waiting for the cron. Anyone other than the
  // configured admin is silently ignored, so the bot never leaks the
  // existence of the command to strangers in DMs.
  bot.command('admin_warmup', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    await ctx.reply('Firing warm-up...');
    await runOnce('warmup', bot);
    await ctx.reply('Done.');
  });

  bot.command('admin_challenge', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    await ctx.reply('Firing challenge...');
    await runOnce('challenge', bot);
    await ctx.reply('Done.');
  });

  bot.command('admin_checkin', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    await ctx.reply('Firing check-in poll...');
    await runCheckinPoll(bot);
    await ctx.reply('Done.');
  });

  bot.catch((err) => {
    logger.error('Grammy uncaught error', { error: String(err.error) });
  });

  return bot;
}

function isAdmin(id: number | undefined): boolean {
  if (!config.adminTelegramId || !id) return false;
  return BigInt(id) === config.adminTelegramId;
}
