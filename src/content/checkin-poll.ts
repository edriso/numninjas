/**
 * The daily "did you practice some math today" check-in poll.
 *
 * Why a poll and not a question
 * ─────────────────────────────
 * Anonymous voting removes pressure. Some days a kid trains, some days
 * they do not, and that is fine. A poll says "you are not alone" without
 * naming anyone. The bot never learns who voted what.
 *
 * Why two options and not three
 * ─────────────────────────────
 * "Yes" / "Not yet" is the smallest possible nudge. A third option would
 * dilute the daily signal. The channel is a daily training habit; the
 * poll is the gentle reminder, not a scoreboard.
 *
 * Constraints (pinned by the unit test)
 * ──────────────────────────────────────
 *  - question  <= 300 chars (Telegram poll limit)
 *  - each option <= 100 chars (Telegram poll limit)
 */

export const CHECKIN_POLL = {
  question: 'Ninjas, did you practise some math today? 🥷',
  options: ['Yes, I trained today ✅', 'Not yet today ⏳'] as [string, string],
  // Default auto-close window in hours. Telegram clamps at 5s..30d.
  // 22h means the poll closes ~15:30 the next day, comfortably before
  // the next 17:30 fire so the next poll lands on a clean slate.
  closeAfterHours: 22,
} as const;
