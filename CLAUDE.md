# NumNinjas: Repo Guide

## What this is

A tiny Telegram bot that posts daily math puzzles for kids aged 10 to 12 to one channel. Every morning (default 07:00 in the configured timezone) it posts two questions, back to back:

1. A warm-up puzzle (gentle, confidence-building).
2. A harder challenge, right after.

Each puzzle is a context message plus a quiz poll. The quiz reveals the correct answer and a short explanation after the reader votes.

The channel is read-only by design. No user accounts, no leaderboards, no DMs to manage. The bot exists to deliver good content on a schedule, and it is completely stateless.

## Shared kernel

The generic, non-domain plumbing lives in **telegram-broadcast-kit** (a separate package, pinned by git tag in `package.json`: `github:edriso/telegram-broadcast-kit#v0.2.2`). NumNinjas consumes it for: the console logger, the root `.env` loader (`loadEnv`), the timezone day math (`dayOfYearIn`), the channel poster (`post`, with opt-in `parseMode: 'HTML'` for the context message), the quiz poll (`sendPoll` in `type: 'quiz'` mode, with `correctOptionId` + `explanation`, the poll-close clamping, and `direction: 'ltr'` so the kit wraps the plain-text question and options in a left-to-right bidi isolate), the node-cron registry + error containment (`Scheduler`, `runJob`), and the `/health` server. The kit gained quiz-poll and opt-in `parseMode` support in v0.2.0 and the poll `direction` option in v0.2.2, which is exactly what this bot needs.

What stays here (numninjas-specific, NOT in the kit): the question pools (`src/content/`), the `Question` type, the HTML context-message builder and `htmlEscape` (`src/lib/format.ts`), the content limits (`src/lib/limits.ts`), the typed daily picker over `Question` objects (`src/lib/pick.ts`, built on the kit's `dayOfYearIn` because the kit's own `pickForDay` only rotates strings), the two-post dispatch and morning batch (`src/scheduler.ts`), the schedule table (`src/schedules.ts`), and the edit-in-place welcome helper (`src/lib/post.ts`, which the kit does not cover).

The pin is auto-bumped by **Renovate** (`renovate.json`): every other dependency is held quiet, so the only PR this repo ever opens is the shared-kernel bump. The `test` job in `.github/workflows/deploy.yml` runs `pnpm check` on every pull request, so that bump PR is gated before merge.

## Folder layout

```
numninjas/
├── src/
│   ├── index.ts          Entry point (bot, kit Scheduler, kit health server).
│   ├── config.ts         env loading via the kit's loadEnv. Required: BOT_TOKEN, CHANNEL_CHAT_ID.
│   ├── bot.ts            Grammy: /start, /about, /admin_warmup, /admin_challenge, /admin_daily.
│   ├── scheduler.ts      The kit's Scheduler + the two-post dispatch; runDailyQuestions posts warm-up then challenge.
│   ├── schedules.ts      THE EDIT POINT for timing: the daily cron entry.
│   ├── types.ts          Question type + Difficulty union.
│   ├── content/
│   │   ├── questions-warmup.ts     The warm-up (easy) pool.
│   │   ├── questions-challenge.ts  The challenge (harder) pool.
│   │   └── welcome.ts              Pinned welcome message body (HTML).
│   └── lib/
│       ├── pick.ts       Typed daily Question picker (uses the kit's dayOfYearIn).
│       ├── format.ts     Builds the HTML context message + quiz poll helpers.
│       ├── limits.ts     Single source of truth for content length limits.
│       └── post.ts       editChannelMessage (the one poster the kit does not cover).
├── scripts/
│   ├── send-test.ts      Manual dev sender (warmup / challenge / both). Not imported by the app.
│   ├── post-welcome.ts   Post or edit-in-place the pinned welcome message.
│   └── audit-questions.ts Sanity-check the pools (length, uniqueness, answer spread).
├── tests/                Vitest unit tests, no network.
├── docs/
│   ├── DEPLOY.md         Host-agnostic deploy notes.
│   └── QUESTIONS.md      How to add a question, plus the cadence/timing reasoning.
├── .env.example          All env vars documented.
├── package.json
└── tsconfig.json
```

## Tech stack

| Layer    | Choice                                  |
| -------- | --------------------------------------- |
| Bot      | TypeScript, Grammy, node-cron, Node 20+ |
| Storage  | none, no database, no state files       |
| Packager | pnpm                                    |
| Tests    | Vitest, no network                      |

## Design choices

- **No database, no state.** The day's two questions are picked deterministically from `dayOfYearInTimezone(date, TZ) % pool.length`. The same calendar day always returns the same questions, so a restart cannot accidentally pick a "new" question for the same slot. The two pools (warm-up, challenge) advance independently. To extend the cycle, just add more questions. Nothing is written to disk, ever.
- **One daily fire, two questions.** A single cron (default `0 7 * * *`) runs `runDailyQuestions`, which posts the warm-up and then the challenge in sequence (awaited, not parallel) so the feed always reads warm-up then challenge, never interleaved.
- **Morning only.** Kids do best with short, frequent practice, and an early-morning post rewards waking up early while never competing with bedtime. A unit test pins every fire to the 05:00 to 11:00 window so no one accidentally schedules a late-night post (it also keeps the hour clear of the 00:00 to 01:00 spring-forward gap node-cron silently skips).
- **Real answers in the poll, not letters.** Math answers are short (like "23 pounds"), so they fit Telegram's 100-char poll-option limit and go straight into the quiz poll. A kid taps the actual answer. This is the one deliberate difference from text-heavy quiz bots that have to hide long answers (such as SQL queries) in the message and show A/B/C/D in the poll. We have no such constraint, so the simpler, friendlier design wins.
- **Two posts per question.** The first is an HTML context message with the real-life scenario, the question, and the hint in a `<tg-spoiler>` tag. The second is a quiz poll replying to the first, carrying the four real answers. The reader sees both posts grouped in the feed.
- **One quiet ping a day.** The morning batch posts four messages (two questions, each a context message plus a poll), but only the day's challenge poll rings. Every context message is silent (it is setup text), and the warm-up poll is silent too, so a follower's phone buzzes once, not four times. The pattern lives in one place, `dailyBatch` in `scheduler.ts` (a `silent` flag per question, with context always silent), and a unit test pins it to exactly one audible post, landing last. To go fully silent, set the challenge to `silent: true`.
- **The context message does not list the options.** They live only in the poll. This keeps the message short for a young reader and avoids spoiling the quiz. A unit test guards that the explanation (the "why") never leaks into the message for any question.
- **Quiz polls reveal the answer.** Quiz polls show the correct option and the explanation when the reader votes. That is the learn-by-doing loop we want.
- **Anonymous polls.** No one can see who voted. There is nothing to track and no privacy footprint, which matters when the audience is children.
- **HTML parse mode.** Telegram HTML has only three special characters (`<`, `>`, `&`) so escaping is trivial. This matters for math text like "3 < 5". `<tg-spoiler>` hides the hint.
- **Poll text is pinned left-to-right.** A poll's question and options are plain text with no `parse_mode`, so Telegram does not infer their direction from their content the way it does for a normal message. The kit (built for Arabic bots) wraps poll text in a right-to-left bidi isolate by default, which mirrored our English polls: "Which answer is correct? 🥷" rendered "🥷 ?Which answer is correct", and a number-first option like "1 sweet" flipped to "sweet 1". The fix lives at the send call, not in the strings: `runQuestion` in `src/scheduler.ts` passes `direction: 'ltr'` to the kit's `sendPoll` (kit v0.2.2+), so the kit wraps the question and each option in a left-to-right isolate instead. `pollQuestion`/`pollOptions` in `src/lib/format.ts` therefore stay plain (a test guards that they carry no bidi control characters). The HTML context message is unaffected (Telegram messages infer direction from their content), so only the poll needs this.
- **`.env` is optional.** `src/config.ts` calls the kit's `loadEnv()`, which finds the project root and loads the single root `.env` if present, and never overrides a variable already set in the real environment. Production hosts that inject env vars need no file. Required values still throw if missing.
- **No retries.** A failed Telegram call is logged; the tick is lost; the next morning takes over. The bot is meant to run for years untouched; a flaky-network day is not worth complicating the code for.
- **Date math is timezone-safe.** `dayOfYearIn` uses `Intl.DateTimeFormat` with the timezone, never `Date.getDate()` which reads the host TZ. This matters when the host is in UTC and the channel runs on Cairo time.
- **Answer spread is checked.** The audit and a unit test make sure the correct answer is not always in the same position, so readers cannot guess "always B" instead of doing the math.
- **Pool audit is a script and a test, not a runtime check.** Author mistakes are caught at edit time by `pnpm audit-questions` and the tests. The runtime trusts the pools.

## How to change what it posts

1. **Pick the right pool.** Easy goes in `src/content/questions-warmup.ts`, harder in `src/content/questions-challenge.ts`. The id prefix must match (`warmup-` or `challenge-`).
2. **Edit or append.** Each entry is a `Question` object. See `docs/QUESTIONS.md` for the full checklist.
3. **Validate.** `pnpm audit-questions && pnpm test`.
4. **Preview.** `pnpm send-test warmup` or `pnpm send-test challenge` posts today's question to the configured channel immediately.
5. **Redeploy.**

## Environment variables

| Variable             | Required | Notes                                                        |
| -------------------- | -------- | ------------------------------------------------------------ |
| `BOT_TOKEN`          | yes      | From `@BotFather`.                                           |
| `CHANNEL_CHAT_ID`    | yes      | Numeric `-100...` is best; `@channel` also works.            |
| `CHANNEL_PUBLIC_URL` | no       | Public link shown by `/start` in DMs.                        |
| `ADMIN_TELEGRAM_ID`  | no       | Unlocks `/admin_warmup`, `/admin_challenge`, `/admin_daily`. |
| `TZ_NAME`            | no       | Cron timezone. Default UTC, sample uses Africa/Cairo.        |
| `DAILY_CRON`         | no       | Override the daily fire (default `0 7 * * *`).               |
| `PORT`               | no       | `/health` server port. Default 8080.                         |
| `NODE_ENV`           | no       | `production` for hosted.                                     |

## Channel admin rights

The bot only needs **"Post messages"**. It never edits or deletes channel messages on a schedule, so no other admin right is required. Question posts stay in the channel scrollback as their own archive.

## Testing

`pnpm test` runs Vitest. The suite covers:

- The question pools: every entry has 4 non-empty, distinct options under 100 chars; an explanation under 200 chars; a valid `correctIndex` that points at a real option; a topic, scenario, prompt, hint, and explanation; no em-dashes; a sane render budget; unique ids; and a correct-answer spread that is not bunched in one position.
- `pickQuestion`: deterministic, cycles through the pool, throws on empty pool, respects the timezone (the day math itself, `dayOfYearIn`, is tested in the kit).
- `formatContextMessage`: contains the brand, topic, scenario, and prompt; hides the hint in a spoiler; never leaks the explanation; shows the right badge; and stays well under 4096 chars.
- The poll helpers: `pollQuestion` stays under 300 chars; `pollOptions` returns the four real answers verbatim and in order; and neither carries any bidi control characters (the kit adds the left-to-right isolate at send time, driven by `direction: 'ltr'`).
- `channelUrlFrom`: handles `@username`, full t.me URLs, numeric ids, and rejects short handles.
- The schedules registry: at least one fire, every cron valid, names unique, and every fire lands in the morning (05:00 to 11:00), never at night.
- The daily batch notifications: the warm-up posts before the challenge, and exactly one item is audible (the last one), so the morning is a single ping.

The generic plumbing (the poster, the quiz poll + close-window clamping, `resolvePort`/`dayOfYearIn`, the cron registry) is tested in telegram-broadcast-kit, so those tests are no longer duplicated here. No test needs a real bot token; `vitest.config.ts` injects placeholders.

## Common gotchas

- **Channel admin rights**: the bot must be a channel admin and "Post messages" must be on. Without it `sendMessage` and `sendPoll` return 403.
- **Numeric chat id is safest**: `-1001234567890` keeps working even if the channel username changes later. `@channel` works but breaks on a rename.
- **The quiz poll goes through the kit**: `sendPoll(bot, chatId, spec, opts)` with `type: 'quiz'`, `correctOptionId` (0-based, required), an optional `explanation` (≤200 chars), and `direction: 'ltr'` (so the kit's RTL-by-default bidi isolate does not mirror our English text). The kit validates the quiz config synchronously and THROWS on a bad `correctOptionId` or over-long explanation (a programming error), and clamps the close window. The poll is threaded under the context message via `replyToMessageId: contextId` (kit v0.2.1+), so it visibly belongs to the problem above it. If you change which message it replies to, keep posting the context message first so the id exists.
- **DST**: node-cron silently drops a job whose wall-clock time does not exist on the spring-forward day. The default 07:00 is safe in every IANA zone, and a test enforces the morning window.
- **Polls are always anonymous**: by design. Nobody can see who voted, including the bot.
- **Keep math answers short**: they go in the poll, so they must stay under 100 chars. The audit will fail otherwise.
- **Both questions share one cron**: changing `DAILY_CRON` moves the whole morning batch. There is no separate warm-up/challenge time.

## Git

- Commit after each meaningful unit of work.
- Keep commit messages simple.
- Do NOT add Co-Authored-By in commit messages.
