/**
 * Post or edit the channel welcome message.
 *
 *   pnpm post-welcome            -> posts a new welcome message
 *   pnpm post-welcome <id>       -> edits the existing welcome message in place
 *
 * The welcome message is meant to be pinned. Edit-in-place keeps the pin
 * (and the silent in-channel position) intact while still letting you
 * update the text.
 */
import { Bot } from 'grammy';
import { post, logger } from 'telegram-broadcast-kit';
import { config } from '../src/config';
import { welcomeHtml } from '../src/content/welcome';
import { editChannelMessage } from '../src/lib/post';

async function main(): Promise<void> {
  const bot = new Bot(config.botToken);
  const rawId = process.argv[2];

  if (rawId) {
    const id = Number(rawId);
    if (!Number.isFinite(id) || id <= 0) {
      console.error(`Bad message id: ${rawId}`);
      process.exit(1);
    }
    const ok = await editChannelMessage(bot, id, welcomeHtml, { parseMode: 'HTML' });
    if (!ok) {
      console.error('Edit failed. See logs above.');
      process.exit(1);
    }
    logger.info('Welcome edited', { messageId: id });
    return;
  }

  const id = await post(bot, config.channelChatId, welcomeHtml, { parseMode: 'HTML' });
  if (!id) {
    console.error('Post failed. See logs above.');
    process.exit(1);
  }
  logger.info('Welcome posted. Pin it from the Telegram client.', { messageId: id });
}

main().catch((err) => {
  logger.error('post-welcome failed', { error: String(err) });
  process.exit(1);
});
