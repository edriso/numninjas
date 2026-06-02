// The bot's public profile copy, set on the bot itself via the Bot API on
// startup (see setBotProfile in ../bot.ts). The matching @BotFather fields
// (Edit About / Edit Description) are documented in docs/BOTFATHER.md.

/**
 * The "About" text (Telegram's short description), shown on the bot's profile.
 * Telegram caps this at 120 characters; this is 118 code points.
 */
export const botAbout =
  'Daily math puzzles for kids 10-12 🥷 A warm-up and a challenge every morning, posted to the channel. Tap Start to join.';

/**
 * The "Description", shown on the empty-chat start screen before a user taps
 * Start. Telegram caps this at 512 characters. Verbatim from docs/BOTFATHER.md.
 */
export const botDescription = [
  '👋 Hi ninja! NumNinjas posts two short math puzzles to its Telegram channel every morning: a gentle warm-up, then a tougher challenge.',
  'Each one is a quick real-life story with a hint and a quiz. Have a go, tap the hint if you are stuck, then vote: Telegram shows the correct answer and a short why right away.',
  'Made for ages 10 to 12. No signup, nothing to install. Parents and teachers welcome.',
  'Tap Start for the channel link.',
].join('\n');
