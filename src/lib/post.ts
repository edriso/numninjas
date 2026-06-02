import type { Bot, Context } from 'grammy';
import { logger } from 'telegram-broadcast-kit';
import { config } from '../config';

// Posting and the quiz poll now go through telegram-broadcast-kit's `post`
// (with parseMode: 'HTML') and `sendPoll` (quiz mode). The one thing the kit
// does NOT cover is editing a channel message in place, which the welcome
// script needs to update the pinned welcome without re-pinning. That stays
// here as a thin numninjas-specific helper.

/**
 * Edit a channel message in place (HTML parse_mode). Used by the welcome
 * script so the pinned welcome can be updated without re-pinning. Non-fatal:
 * logs and returns false on failure, never throws.
 */
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
