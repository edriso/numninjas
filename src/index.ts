import type { Bot } from 'grammy';
import { buildBot } from './bot';
import { startScheduler } from './scheduler';
import { startHealthServer } from './health';
import { logger } from './lib/logger';
import { config } from './config';

let shuttingDown = false;

async function shutdown(signal: string, bot: Bot): Promise<void> {
  if (shuttingDown) return; // a second signal must not race the first
  shuttingDown = true;
  logger.info(`${signal} received, shutting down...`);
  // node-cron tasks stop when the process exits, so there is nothing to
  // unregister. Await bot.stop() so an in-flight update is not cut off, but
  // cap the wait so a stuck network call cannot hang shutdown forever.
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
  startHealthServer({ scheduleCount });

  logger.info('Starting bot', {
    timezone: config.timezone,
    dailyCron: config.dailyCron,
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
