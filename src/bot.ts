import { Bot } from 'grammy';
import { logger } from 'telegram-broadcast-kit';
import { config } from './config';
import { runDailyQuestions, runQuestion } from './scheduler';
import { botAbout, botDescription } from './content/profile';

/**
 * Build and configure the Grammy bot. The bot exists mainly to drive
 * the scheduled channel posts. The DM surface is intentionally minimal:
 * a /start and /about that point new arrivals to the channel, and
 * optional admin commands that fire the questions on demand for testing.
 */
export function buildBot(): Bot {
  const bot = new Bot(config.botToken);

  bot.command('start', async (ctx) => {
    const link = config.channelUrl;
    const tail = link ? `\n\nJoin the channel: ${link}` : '';
    await ctx.reply(
      [
        '👋 Hi ninja! NumNinjas posts two short math puzzles every morning to its Telegram channel.',
        '',
        'A gentle warm-up and then a tougher challenge, first thing in the day. Each one is a quick real-life story with a hint and a quiz, so you can check yourself in seconds.',
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

  // Admin-only manual fire. Useful when you want to preview a question
  // without waiting for the morning cron. Anyone other than the
  // configured admin is silently ignored, so the bot never leaks the
  // existence of these commands to strangers in DMs.
  bot.command('admin_warmup', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    await ctx.reply('Firing warm-up...');
    await runQuestion('warmup', bot);
    await ctx.reply('Done.');
  });

  bot.command('admin_challenge', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    await ctx.reply('Firing challenge...');
    await runQuestion('challenge', bot);
    await ctx.reply('Done.');
  });

  // Fire the full morning batch (warm-up then challenge), exactly as the
  // daily cron would.
  bot.command('admin_daily', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    await ctx.reply('Firing the daily batch...');
    await runDailyQuestions(bot);
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

/**
 * Set the bot's public commands, About (short description), and Description via
 * the Bot API, so the whole profile is self-describing on deploy with no manual
 * @BotFather step. The texts live in src/content/profile.ts.
 */
export async function setBotProfile(bot: Bot): Promise<void> {
  await bot.api.setMyCommands([
    { command: 'start', description: 'What NumNinjas is and how to join the channel' },
    { command: 'about', description: 'About this open-source bot' },
  ]);
  await bot.api.setMyShortDescription(botAbout);
  await bot.api.setMyDescription(botDescription);
}
