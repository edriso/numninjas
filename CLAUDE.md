# NumNinjas: Repo Guide

## What this is

A tiny Telegram bot that posts daily math puzzles for kids aged 10 to 12 to one channel. It posts three things every day:

1. A warm-up math puzzle in the afternoon (default 15:00 in the configured timezone).
2. A short anonymous "did you practise some math today?" yes/no poll (default 17:30).
3. A harder evening challenge (default 19:30).

The puzzle posts are a context message plus a quiz poll. The quiz reveals the correct answer and a short explanation after the reader votes. The check-in poll is a plain anonymous regular poll: two options, no correct answer, no pressure.

The channel is read-only by design. No user accounts, no leaderboards, no DMs to manage. The bot exists to deliver good content on a schedule.

## Folder layout

```
numninjas-telegram-channel/
├── src/
│   ├── index.ts          Entry point (initState, bot, scheduler, health server)
│   ├── config.ts         env loading. Required: BOT_TOKEN, CHANNEL_CHAT_ID.
│   ├── bot.ts            Grammy: /start, /about, /admin_warmup, /admin_challenge, /admin_checkin.
│   ├── scheduler.ts      node-cron wiring; runSchedule dispatches by kind.
│   ├── schedules.ts      THE EDIT POINT for timing: discriminated union of schedule kinds.
│   ├── types.ts          Question type + Difficulty union.
│   ├── health.ts         /health HTTP endpoint for platform liveness checks.
│   ├── content/
│   │   ├── questions-warmup.ts     The warm-up (easy) pool.
│   │   ├── questions-challenge.ts  The challenge (harder) pool.
│   │   ├── checkin-poll.ts         The daily "did you practise math today" poll body.
│   │   └── welcome.ts              Pinned welcome message body (HTML).
│   └── lib/
│       ├── logger.ts     Tiny structured console logger.
│       ├── pick.ts       Deterministic day-of-year picker (timezone aware).
│       ├── format.ts     Builds the HTML context message + quiz poll helpers.
│       ├── limits.ts     Single source of truth for content length limits.
│       ├── state.ts      Tiny JSON pointer file: tracks last check-in poll id.
│       └── post.ts       Context message, quiz poll, regular poll, edit, delete.
├── scripts/
│   ├── send-test.ts      Manual dev sender (warmup / challenge / both). Not imported by the app.
│   ├── post-welcome.ts   Post or edit-in-place the pinned welcome message.
│   └── audit-questions.ts Sanity-check the pools (length, uniqueness, answer spread).
├── tests/                Vitest unit tests, no network.
├── docs/
│   ├── DEPLOY.md         Host-agnostic deploy notes.
│   └── QUESTIONS.md      How to add a question, plus the daily-count reasoning.
├── .env.example          All env vars documented.
├── package.json
└── tsconfig.json
```

## Tech stack

| Layer    | Choice                                                             |
| -------- | ------------------------------------------------------------------ |
| Bot      | TypeScript, Grammy, node-cron, Node 20+                            |
| Storage  | none, no database; one tiny JSON pointer file for check-in cleanup |
| Packager | pnpm                                                               |
| Tests    | Vitest, no network                                                 |

## Design choices

- **No database.** Both questions for a given day are picked deterministically from `dayOfYearInTimezone(date, TZ) % pool.length`. The same calendar day always returns the same question, so a restart cannot accidentally pick a "new" question for the same slot. The two pools (warm-up, challenge) advance independently. To extend the cycle, just add more questions.
- **Real answers in the poll, not letters.** Math answers are short (like "23 pounds"), so they fit Telegram's 100-char poll-option limit and go straight into the quiz poll. A kid taps the actual answer. This is the one deliberate difference from text-heavy quiz bots that have to hide long answers (such as SQL queries) in the message and show A/B/C/D in the poll. We have no such constraint, so the simpler, friendlier design wins.
- **Two posts per question.** The first is an HTML context message with the real-life scenario, the question, and the hint in a `<tg-spoiler>` tag. The second is a quiz poll replying to the first, carrying the four real answers. The reader sees both posts grouped in the feed.
- **The context message does not list the options.** They live only in the poll. This keeps the message short for a young reader and avoids spoiling the quiz. A unit test guards that the correct answer text never leaks into the message.
- **Quiz polls, not regular polls, for questions.** Quiz polls reveal the correct answer and the explanation when the reader votes. That is the learn-by-doing loop we want.
- **Anonymous polls.** No one can see who voted. There is nothing to track and no privacy footprint, which matters when the audience is children.
- **One deliberate carve-out: `src/lib/state.ts`.** A tiny JSON pointer file (default `./data/last-message-ids.json`) remembers the check-in poll's last message id so the "replace on next fire" delete survives a restart. It is NOT a database: no schema, no migrations, no queries. Same conceptual weight as `.env`. Losing it just leaks one stale poll until the next fire writes a new pointer.
- **Check-in poll: replace on next fire.** When the daily check-in poll fires, the new poll is posted first, the previous id is then deleted (best-effort, non-fatal), and the pointer is updated. Order is post-then-delete so the channel is never empty mid-cycle. If the delete fails (e.g. the bot lacks "Delete messages") the new poll still goes up; only the cleanup degrades. Telegram's `close_date` (22 hours) backs this up so even an undeleted poll auto-closes.
- **Two schedule kinds, one dispatcher.** `ScheduleDef` is a discriminated union (`kind: 'question' | 'checkin_poll'`). `scheduler.ts#runSchedule` switches on `kind`. Adding a new schedule type (a Friday brain teaser, a weekend roundup) is a new union variant plus one switch case.
- **HTML parse mode.** Telegram HTML has only three special characters (`<`, `>`, `&`) so escaping is trivial. This matters for math text like "3 < 5". `<tg-spoiler>` hides the hint.
- **`.env` is optional.** `src/config.ts` tries `import('dotenv')` and silently skips if dotenv is not installed. Production hosts that inject env vars need neither the file nor the package. Required values still throw if missing.
- **No retries.** A failed Telegram call is logged; the tick is lost; the next fire takes over. The bot is meant to run for years untouched; a flaky-network day is not worth complicating the code for.
- **Date math is timezone-safe.** `dayOfYearIn` uses `Intl.DateTimeFormat` with the timezone, never `Date.getDate()` which reads the host TZ. This matters when the host is in UTC and the channel runs on Cairo time.
- **Schedule times avoid the DST gap.** Defaults of 15:00, 17:30, and 19:30 sit well clear of the 00:00 to 01:00 spring-forward window (which node-cron silently skips). A unit test enforces every hour field is at least 1.
- **Answer spread is checked.** The audit and a unit test make sure the correct answer is not always in the same position, so readers cannot guess "always B" instead of doing the math.
- **Pool audit is a script and a test, not a runtime check.** Author mistakes are caught at edit time by `pnpm audit-questions` and the tests. The runtime trusts the pools.

## How to change what it posts

1. **Pick the right pool.** Easy goes in `src/content/questions-warmup.ts`, harder in `src/content/questions-challenge.ts`. The id prefix must match (`warmup-` or `challenge-`).
2. **Edit or append.** Each entry is a `Question` object. See `docs/QUESTIONS.md` for the full checklist.
3. **Validate.** `pnpm audit-questions && pnpm test`.
4. **Preview.** `pnpm send-test warmup` or `pnpm send-test challenge` posts today's question to the configured channel immediately.
5. **Redeploy.**

## Environment variables

| Variable             | Required | Notes                                                          |
| -------------------- | -------- | -------------------------------------------------------------- |
| `BOT_TOKEN`          | yes      | From `@BotFather`.                                             |
| `CHANNEL_CHAT_ID`    | yes      | Numeric `-100...` is best; `@channel` also works.              |
| `CHANNEL_PUBLIC_URL` | no       | Public link shown by `/start` in DMs.                          |
| `ADMIN_TELEGRAM_ID`  | no       | Unlocks `/admin_warmup`, `/admin_challenge`, `/admin_checkin`. |
| `TZ_NAME`            | no       | Cron timezone. Default UTC, sample uses Africa/Cairo.          |
| `WARMUP_CRON`        | no       | Override the warm-up cron (default `0 15 * * *`).              |
| `CHECKIN_POLL_CRON`  | no       | Override the check-in poll cron (default `30 17 * * *`).       |
| `CHALLENGE_CRON`     | no       | Override the challenge cron (default `30 19 * * *`).           |
| `STATE_FILE`         | no       | Pointer file path. Default `./data/last-message-ids.json`.     |
| `PORT`               | no       | `/health` server port. Default 8080.                           |
| `NODE_ENV`           | no       | `production` for hosted.                                       |

## Channel admin rights

The bot needs **"Post messages"** for everything, plus **"Delete messages"** for the check-in poll cleanup. Without the delete right the bot still posts, but the previous poll is not removed; you will see polls accumulate over time. Question posts are never auto-deleted; the channel scrollback is their archive.

## Testing

`pnpm test` runs Vitest. The suite covers:

- The question pools: every entry has 4 non-empty, distinct options under 100 chars; an explanation under 200 chars; a valid `correctIndex` that points at a real option; a topic, scenario, prompt, hint, and explanation; no em-dashes; a sane render budget; unique ids; and a correct-answer spread that is not bunched in one position.
- `pickForDay`: deterministic, cycles through the pool, throws on empty pool, respects the timezone.
- `formatContextMessage`: contains the brand, topic, scenario, and prompt; hides the hint in a spoiler; does not leak the answer; shows the right badge; and stays well under 4096 chars.
- `channelUrlFrom`: handles `@username`, full t.me URLs, numeric ids, and rejects short handles.
- `resolvePort`: defaults to 8080 and rejects garbage.
- The check-in poll content: question and options are within Telegram's poll limits, close window is sane, exactly two options.
- The state module: round-trips a tracked id across a simulated restart, drops malformed values, survives a corrupt file, and is a no-op when `initState` was never called (tests).
- The schedules registry: exactly three fires, every cron valid, names unique, both difficulties plus a check-in poll present, and no fire inside the DST gap.

No test needs a real bot token; `vitest.config.ts` injects placeholders.

## Common gotchas

- **Channel admin rights**: the bot must be a channel admin and "Post messages" must be on. Without it `sendMessage` and `sendPoll` return 403.
- **Numeric chat id is safest**: `-1001234567890` keeps working even if the channel username changes later. `@channel` works but breaks on a rename.
- **`correct_option_ids`, not `correct_option_id`**: Bot API 9.x renamed this to a plural array. A single-element array preserves the quiz behaviour. See `src/lib/post.ts`.
- **DST**: node-cron silently drops a job whose wall-clock time does not exist on the spring-forward day. Defaults of 15:00, 17:30, and 19:30 are safe in every IANA zone.
- **Polls are always anonymous**: by design. Nobody can see who voted, including the bot.
- **Keep math answers short**: they go in the poll, so they must stay under 100 chars. The audit will fail otherwise.
- **Check-in poll cleanup needs "Delete messages"**: without it the post still works, the cleanup just logs a warning and stale polls pile up until you grant the right.
- **The state file is per-deploy**: if you deploy to a new host without copying `./data/last-message-ids.json`, the first check-in fire will not delete anything (the pointer is empty). That is fine; the orphan ages out as Telegram auto-closes it at 22h.

## Git

- Commit after each meaningful unit of work.
- Keep commit messages simple.
- Do NOT add Co-Authored-By in commit messages.
