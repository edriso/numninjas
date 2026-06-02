import type { Bot } from 'grammy';
import { startHealthServer, logger } from 'telegram-broadcast-kit';
import { buildBot } from './bot';
import { startScheduler, stopScheduler } from './scheduler';
import { config } from './config';

let shuttingDown = false;

async function shutdown(signal: string, bot: Bot): Promise<void> {
  if (shuttingDown) return; // a second signal must not race the first
  shuttingDown = true;
  logger.info(`${signal} received, shutting down...`);
  // Stop the cron tasks first, then await bot.stop() so an in-flight update is
  // not cut off, capping the wait so a stuck network call cannot hang shutdown
  // forever.
  stopScheduler();
  try {
    await Promise.race([bot.stop(), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  } catch (err) {
    logger.error('Error while stopping the bot', { error: String(err) });
  }
  process.exit(0);
}

async function main(): Promise<void> {
  const bot = buildBot();

  process.once('SIGINT', () => void shutdown('SIGINT', bot));
  process.once('SIGTERM', () => void shutdown('SIGTERM', bot));

  const scheduleCount = startScheduler(bot);
  // The kit's health server reads PORT from the environment on its own.
  startHealthServer();

  logger.info('Starting bot', {
    timezone: config.timezone,
    dailyCron: config.dailyCron,
    schedules: scheduleCount,
    isDev: config.isDev,
  });

  await bot.start({
    onStart: (info) => {
      logger.info('Bot started', { username: info.username });
    },
  });
}

main().catch(async (err) => {
  logger.error('Fatal error during startup', { error: String(err) });
  // Delay before exit so a misconfigured deploy does not spin a tight
  // restart loop on platforms that restart immediately.
  await new Promise((r) => setTimeout(r, 30_000));
  process.exit(1);
});
