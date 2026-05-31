# NumNinjas 🥷

A tiny Telegram bot that posts daily math puzzles for kids aged 10 to 12. Every morning it posts two short questions to one channel:

- A **warm-up** puzzle (a gentle confidence builder)
- A **challenge** that stretches a little further

Both go out first thing in the morning, back to back. Each question is a quick real-life story (shopping, sharing snacks, a school play, a football match) with a hint and a quiz. The reader taps an answer and Telegram shows the correct one with a short explanation. The English is plain, the numbers are friendly, and nothing takes more than 30 seconds.

The project is junior friendly on purpose, both for the kids reading it and for any developer who opens the code.

## How a question looks

Each puzzle is two posts in the channel:

1. A context message: a difficulty badge, the topic, a one-line real-life story, the question, and a hint hidden behind a Telegram spoiler tag.
2. A quiz poll right below it. The four answers are the real choices (like "23 pounds"), not letters, so a kid just taps the one they think is right. Telegram then reveals the correct answer and a short why.

The feedback is instant and anonymous. Nobody can see who voted what.

## How many questions, when, and why

Two questions, posted together every morning (default 07:00 in the configured timezone): the warm-up first, then the challenge.

- **Morning only.** A single early session rewards waking up early and posts nothing at night, so the channel never competes with bedtime. Good sleep and an early start matter more for this age than squeezing in an evening puzzle.
- **Two, not one.** Research on kids aged 10 to 12 favours short, frequent practice. Two 30-second puzzles, an easy one to build confidence and a harder one to stretch, is a "little and often" morning warm-up for the brain, not a long study block.

If you would rather post just one a day, or split them across the day, it is a small change. See `docs/QUESTIONS.md`.

## Tech stack

| Part     | Choice                                  |
| -------- | --------------------------------------- |
| Bot      | TypeScript, Grammy, node-cron, Node 20+ |
| Storage  | none, no database, no state files       |
| Content  | TypeScript files in `src/content/`      |
| Packager | pnpm                                    |
| Tests    | Vitest, no network                      |

There is no database and no state of any kind. All the questions live in source files. To add or change a question, you edit a file and redeploy.

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

| Slot              | Default cron | What it posts                               |
| ----------------- | ------------ | ------------------------------------------- |
| Morning warm-up   | `0 7 * * *`  | Easy math puzzle                            |
| Morning challenge | `0 7 * * *`  | Harder math puzzle, right after the warm-up |

Both questions fire from a single `0 7 * * *` cron. The cron runs in the timezone set by `TZ_NAME` (default UTC, the sample sets Africa/Cairo). Override the time with `DAILY_CRON`.

## Picking is deterministic

The bot picks today's question by `dayOfYearInTimezone % poolLength`. That means:

- The same calendar day always picks the same question, even if the cron restarts or refires.
- The two pools advance independently. The repo ships with about 30 in each pool, which gives roughly a month of unique content per slot before any question repeats.
- Add more questions and the cycle lengthens automatically. No config needed.

## Adding a question

See `docs/QUESTIONS.md`. The short version: append an object to `src/content/questions-warmup.ts` or `src/content/questions-challenge.ts`, then run `pnpm audit-questions` and `pnpm test`. If both pass, redeploy.

## Why no database (and no state at all)

A daily question channel does not need user accounts, saved votes, or a leaderboard. Telegram tallies the quiz polls itself. The bot is completely stateless: it picks the day's questions from a deterministic formula and posts them. There are no databases, no migrations, and no pointer files to back up or persist. Fewer parts means fewer things that can break, and no privacy footprint, which matters doubly when the audience is children.

## Environment variables

All variables are documented in `.env.example`. Only two are required:

- `BOT_TOKEN`: from `@BotFather`
- `CHANNEL_CHAT_ID`: the numeric chat id (recommended) or `@channel` handle

The `.env` file itself is optional. Production hosts that inject env vars directly do not need a file at all. The bot only needs the "Post messages" admin right in the channel; nothing it does ever deletes a message.

## Scripts

| Command                   | What it does                                                         |
| ------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                | Start the bot locally with hot reload                                |
| `pnpm start`              | Run the bot in production (runs the source through tsx)              |
| `pnpm build`              | Type-check and compile TypeScript to `dist/` (optional, for CI)      |
| `pnpm test`               | Run unit tests (no network)                                          |
| `pnpm typecheck`          | TypeScript with no emit                                              |
| `pnpm audit-questions`    | Validate the question pools (option length, id uniqueness, etc.)     |
| `pnpm send-test [mode]`   | Fire a question into the channel now. mode = warmup, challenge, both |
| `pnpm post-welcome [id?]` | Post the channel welcome message, or edit it in place by id          |
| `pnpm format`             | Prettier across the repo                                             |

## License

MIT. See `LICENSE`.
