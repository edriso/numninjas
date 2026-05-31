# NumNinjas 🥷

A tiny Telegram bot that posts daily math puzzles for kids aged 10 to 12. It posts three things to one channel every day:

- A **warm-up** puzzle in the afternoon (a gentle confidence builder)
- A short anonymous **"did you practise some math today?"** check-in poll
- An **evening challenge** that stretches a little further

Every question is a quick real-life story (shopping, sharing snacks, a school play, a football match) with a hint and a quiz. The reader taps an answer and Telegram shows the correct one with a short explanation. The English is plain, the numbers are friendly, and nothing takes more than 30 seconds.

The project is junior friendly on purpose, both for the kids reading it and for any developer who opens the code.

## How a question looks

Each puzzle is two posts in the channel:

1. A context message: a difficulty badge, the topic, a one-line real-life story, the question, and a hint hidden behind a Telegram spoiler tag.
2. A quiz poll right below it. The four answers are the real choices (like "23 pounds"), not letters, so a kid just taps the one they think is right. Telegram then reveals the correct answer and a short why.

The feedback is instant and anonymous. Nobody can see who voted what.

## The daily check-in poll

Once a day the bot posts a short anonymous yes/no poll:

> Ninjas, did you practise some math today? 🥷
>
> - Yes, I trained today ✅
> - Not yet today ⏳

It is a gentle nudge, not a scoreboard. The poll auto-closes after 22 hours, and when the next one goes up the previous one is deleted, so the channel never fills with a year of old polls. The poll is anonymous: nobody, not even the bot, can see who voted.

## How many questions a day, and why

Two questions, spread across the day, plus the check-in poll. Research on kids aged 10 to 12 favours "little and often" over one long block: short daily practice of 15 to 20 minutes builds the habit without overwhelming a young reader. Two 30-second puzzles (a gentle one after school, a tougher one in the evening) fit that nicely, and the warm-up keeps confidence high before the challenge.

If you would rather post just one puzzle a day, it is a one-line change. See `docs/QUESTIONS.md`.

## Tech stack

| Part     | Choice                                  |
| -------- | --------------------------------------- |
| Bot      | TypeScript, Grammy, node-cron, Node 20+ |
| Storage  | none, no database                       |
| Content  | TypeScript files in `src/content/`      |
| Packager | pnpm                                    |
| Tests    | Vitest, no network                      |

There is no database. All the questions live in source files. To add or change a question, you edit a file and redeploy.

## Quick start

```bash
pnpm install
cp .env.example .env          # optional, you can also pass env vars another way
# fill in BOT_TOKEN and CHANNEL_CHAT_ID
pnpm test                     # run the unit tests
pnpm audit-questions          # sanity-check the question pools
pnpm dev                      # run the bot locally
```

You will need a bot from `@BotFather` and a channel where you have added the bot as an admin with the "Post messages" permission.

## Daily schedule

| Slot              | Default cron  | What it posts                              |
| ----------------- | ------------- | ------------------------------------------ |
| Afternoon warm-up | `0 15 * * *`  | Easy math puzzle                           |
| Check-in nudge    | `30 17 * * *` | "Did you practise math today?" yes/no poll |
| Evening challenge | `30 19 * * *` | Harder math puzzle                         |

The cron runs in the timezone set by `TZ_NAME` (default UTC, the sample sets Africa/Cairo). Override the times with `WARMUP_CRON`, `CHECKIN_POLL_CRON`, and `CHALLENGE_CRON`.

## Picking is deterministic

The bot picks today's question by `dayOfYearInTimezone % poolLength`. That means:

- The same calendar day always picks the same question, even if the cron restarts or refires.
- The two pools advance independently. The repo ships with about 30 in each pool, which gives roughly a month of unique content per slot before any question repeats.
- Add more questions and the cycle lengthens automatically. No config needed.

## Adding a question

See `docs/QUESTIONS.md`. The short version: append an object to `src/content/questions-warmup.ts` or `src/content/questions-challenge.ts`, then run `pnpm audit-questions` and `pnpm test`. If both pass, redeploy.

## Why no database

A daily question channel does not need user accounts, saved votes, or a leaderboard. Telegram already tallies the anonymous polls. Keeping the project stateless means fewer parts that can break, no schema migrations, and no privacy footprint, which matters doubly when the audience is children.

There is exactly one tiny exception: a small JSON pointer file (default `./data/last-message-ids.json`) remembers the previous check-in poll's message id so the next fire can delete it. This is NOT a database. It has no schema, no migrations, no queries. Same conceptual weight as `.env`. Losing the file just means the next fire skips one cleanup and the channel keeps working. See `src/lib/state.ts`.

## Environment variables

All variables are documented in `.env.example`. Only two are required:

- `BOT_TOKEN`: from `@BotFather`
- `CHANNEL_CHAT_ID`: the numeric chat id (recommended) or `@channel` handle

The `.env` file itself is optional. Production hosts that inject env vars directly do not need a file at all.

To make the check-in poll delete the previous one, the bot must be a channel admin with BOTH "Post messages" AND "Delete messages" permissions. Without delete permission the poll still posts, and the cleanup just logs a warning.

## Scripts

| Command                   | What it does                                                           |
| ------------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`                | Start the bot locally with hot reload                                  |
| `pnpm start`              | Run the bot in production (runs the source through tsx)                |
| `pnpm build`              | Type-check and compile TypeScript to `dist/` (optional, for CI)        |
| `pnpm test`               | Run unit tests (no network)                                            |
| `pnpm typecheck`          | TypeScript with no emit                                                |
| `pnpm audit-questions`    | Validate the question pools (option length, id uniqueness, etc.)       |
| `pnpm send-test [mode]`   | Fire one question into the channel now. mode = warmup, challenge, both |
| `pnpm post-welcome [id?]` | Post the channel welcome message, or edit it in place by id            |
| `pnpm format`             | Prettier across the repo                                               |

## License

MIT. See `LICENSE` if present, or assume MIT.
