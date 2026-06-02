// One .env for the whole bot. loadEnv() (from telegram-broadcast-kit) finds the
// project root and loads the single .env there, no matter which folder a command
// runs from. Production hosts inject env vars directly; loadEnv never overrides
// an already-set variable, so process.env stays the source of truth.
import { loadEnv } from 'telegram-broadcast-kit';

loadEnv();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalBigInt(raw: string | undefined): bigint | null {
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

/**
 * Turn a raw value into a public https://t.me/ link, or null if it has
 * no derivable public link. Accepts an "@username", a "t.me/..." URL,
 * or a full "https://t.me/..." URL. A numeric "-100..." id returns null
 * because it has no public link without an API call and admin rights.
 */
export function channelUrlFrom(raw: string): string | null {
  const id = raw.trim();
  if (id.startsWith('@')) {
    const handle = id.slice(1);
    return /^[A-Za-z0-9_]{4,32}$/.test(handle) ? `https://t.me/${handle}` : null;
  }
  const m = id.match(/^https?:\/\/t\.me\/(.+)$/i) ?? id.match(/^t\.me\/(.+)$/i);
  return m ? `https://t.me/${m[1]}` : null;
}

const channelChatId = requireEnv('CHANNEL_CHAT_ID').trim();
const channelPublicUrl = process.env.CHANNEL_PUBLIC_URL?.trim();

export const config = Object.freeze({
  botToken: requireEnv('BOT_TOKEN'),
  // Best practice is the numeric "-100..." id. "@channel" also works.
  // Passed as-is to the Bot API.
  channelChatId,
  // Public link for /start in DMs. null if not configured.
  channelUrl: channelUrlFrom(channelPublicUrl || channelChatId),
  // Optional. If unset, /admin_* commands authorise nobody.
  adminTelegramId: optionalBigInt(process.env.ADMIN_TELEGRAM_ID),
  // Timezone for the daily cron schedule. Defaults to UTC.
  timezone: process.env.TZ_NAME?.trim() || 'UTC',
  // Cron expression for the single daily fire. Default 07:00 in the
  // configured timezone: a "morning ninja warm-up" that rewards waking
  // early and posts nothing at night, so it never keeps a kid up late.
  // Both questions (warm-up then challenge) post together at this time.
  // 07:00 sits well clear of the 00:00..01:00 spring-forward gap that
  // node-cron silently skips.
  dailyCron: process.env.DAILY_CRON?.trim() || '0 7 * * *',
  isDev: process.env.NODE_ENV !== 'production',
});
