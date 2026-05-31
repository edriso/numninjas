// Load a local .env file IF the optional `dotenv` package is installed
// AND a `.env` file exists. Production hosts inject env vars directly,
// so neither the package nor the file is required. Missing either path
// is silently fine: process.env is the source of truth.
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch {
  // dotenv is optional. In prod with env injected by the host, this
  // import can be omitted entirely (npm install --omit=optional) and
  // the bot still runs from process.env.
}

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
  // Passed as-is to bot.api.sendMessage.
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
  port: resolvePort(process.env.PORT),
  isDev: process.env.NODE_ENV !== 'production',
});

export function resolvePort(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 && n < 65_536 ? n : 8080;
}
