import { buildBot } from './bot';
import { startScheduler } from './scheduler';
import { startHealthServer } from './health';
import { logger } from './lib/logger';
import { config } from './config';
import { initState } from './lib/state';

async function main(): Promise<void> {
  // Load the small pointer file that remembers the last check-in poll
  // message id (so the next fire can delete it). Never throws; a missing
  // file just means "start empty".
  await initState(config.stateFilePath);

  const bot = buildBot();

  const scheduleCount = startScheduler(bot);
  startHealthServer({ scheduleCount });

  logger.info('Starting bot', {
    timezone: config.timezone,
    warmupCron: config.warmupCron,
    challengeCron: config.challengeCron,
    checkinPollCron: config.checkinPollCron,
    isDev: config.isDev,
  });

  await bot.start({
    onStart: (info) => {
      logger.info('Bot started', { username: info.username });
    },
  });
}

main().catch((err) => {
  logger.error('Fatal error during startup', { error: String(err) });
  process.exit(1);
});
