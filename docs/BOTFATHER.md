# BotFather setup (copy and paste)

Ready-to-paste text for the NumNinjas bot in @BotFather (the `/mybots` ->
Edit Bot menu). The public texts are English. Copy each block as-is.

Note: the bot now self-sets its About and Description on startup via the Bot
API (see setBotProfile in src/bot.ts), so those two fields stay in sync from
the source. Commands are still NOT set automatically by design, so paste the
Commands block below into BotFather to get the menu.

---

## Name

NumNinjas

## About

(BotFather "Edit About", max ~120 characters. Shown on the bot's profile.)

Daily math puzzles for kids 10-12 🥷 A warm-up and a challenge every morning, posted to the channel. Tap Start to join.

## Description

(BotFather "Edit Description", max ~512 characters. Shown on the empty-chat
start screen, before the user presses Start.)

👋 Hi ninja! NumNinjas posts two short math puzzles to its Telegram channel every morning: a gentle warm-up, then a tougher challenge.
Each one is a quick real-life story with a hint and a quiz. Have a go, tap the hint if you are stuck, then vote: Telegram shows the correct answer and a short why right away.
Made for ages 10 to 12. No signup, nothing to install. Parents and teachers welcome.
Tap Start for the channel link.

---

## Commands

When BotFather says "Send me a list of commands", paste exactly this block
(no leading slashes, one command per line, `command - description`):

start - What NumNinjas is and how to join the channel
about - About this open-source bot

---

## Other settings

- Botpic: optional, set your own image in BotFather.
- Privacy Policy: optional. The bot stores nothing about users (no database,
  no saved votes). If you publish a policy, host a short page saying that and
  set its URL in BotFather. Not required.
- Group privacy: this bot only posts to a channel and answers /start in DM,
  so you can leave group privacy ON (the default).
