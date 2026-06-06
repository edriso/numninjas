# Deployment

This bot is small. It runs anywhere Node 20 runs: Fly.io, Railway, Render, a VPS, a Docker container, or your laptop. There is no database, no migrations, and no state files. The bot is completely stateless: it picks the day's questions from a formula and posts them.

## What you need

1. A Telegram bot from `@BotFather`. Save the token.
2. A Telegram channel where the bot is an admin with the **Post messages** permission. That is the only right it needs; the bot never edits or deletes channel messages on a schedule.
3. The channel id. Easiest path: forward a channel message to `@RawDataBot` or `@JsonDumpBot` and read `chat.id`. It looks like `-1001234567890`. The numeric id is preferred; it survives a username change.

## Environment variables

| Variable             | Required | Notes                                                        |
| -------------------- | -------- | ------------------------------------------------------------ |
| `BOT_TOKEN`          | yes      | From `@BotFather`.                                           |
| `CHANNEL_CHAT_ID`    | yes      | Numeric `-100...` is best; `@channel` also works.            |
| `CHANNEL_PUBLIC_URL` | no       | Public link shown by `/start` in DMs.                        |
| `ADMIN_TELEGRAM_ID`  | no       | Unlocks `/admin_warmup`, `/admin_challenge`, `/admin_daily`. |
| `TZ_NAME`            | no       | Cron timezone. Default UTC; the example sets Africa/Cairo.   |
| `DAILY_CRON`         | no       | Override the daily morning fire (default `0 7 * * *`).       |
| `PORT`               | no       | `/health` server port. Default 8080.                         |
| `NODE_ENV`           | no       | `production` for hosted.                                     |

The `.env` file is optional. If you set the variables in your host's dashboard, you do not need a file at all.

## First post: the pinned welcome

Once the bot is up and is a channel admin, run:

```bash
pnpm post-welcome
```

The bot posts the welcome message and prints the message id. Open the channel, long-press the welcome, and pin it. To edit later in place (the pin stays, no notification fires):

```bash
pnpm post-welcome <message_id>
```

## Smoke test the questions

```bash
pnpm send-test warmup      # fires today's warm-up question to the channel now
pnpm send-test challenge   # fires today's challenge question
pnpm send-test both        # fires both, warm-up first (same as the daily cron)
```

The script preflights `getChat` first, so if the token is wrong or the channel id is bad, you get one clean error instead of two confusing ones. You can also fire the full morning batch from a DM with `/admin_daily` after setting `ADMIN_TELEGRAM_ID`.

## Hosting recipes

### Fly.io

```bash
fly launch --no-deploy             # answer the prompts; pick a region near your audience
fly secrets set BOT_TOKEN=... CHANNEL_CHAT_ID=... TZ_NAME=Africa/Cairo
fly deploy
fly logs
```

Run `pnpm start` (which runs `node --import tsx src/index.ts`). The `/health` endpoint on port 8080 keeps the machine alive.

### Railway

1. Create a new project from this repo.
2. Add the env vars in the dashboard.
3. Set the start command to `pnpm start` (or `pnpm dev` for hot reload, not recommended in prod).
4. Done.

### Plain VPS

```bash
pnpm install
pnpm start
```

Wrap it in a systemd unit or pm2 so it restarts on crash. Set the env vars in the unit file or in a `.env` next to the binary. The bot runs the TypeScript source directly through `tsx`, so there is no separate build step to remember.

### Docker

A minimal Dockerfile:

```Dockerfile
FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install
COPY . .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["pnpm", "start"]
```

The image is a few hundred MB. There is nothing to mount; logs go to stdout.

## Verifying it works

1. Check `/health` returns 200 with `{"ok":true,"schedules":1,...}`.
2. Tail the logs for the `Schedule registered` line at startup (you should see one: `daily_questions`).
3. Send `/start` to the bot in DM; you should get a welcome reply pointing at the channel.
4. Use `pnpm send-test both` to verify the warm-up and challenge channel posts end to end.
5. Wait for the cron to fire in the morning. The first real fire is the final test.

## What to do when something breaks

- **No post arrived.** Check the logs for `Schedule fired` then `Failed to post`. The most common cause is the bot is not an admin in the channel or "Post messages" is off.
- **403 from Telegram on send.** Bot is not a channel admin, or "Post messages" is off.
- **400 "message is too long".** A question exceeded 4096 chars. Run `pnpm audit-questions`; the render budget check should catch it first.
- **Wrong question for today.** Questions are generated deterministically from the calendar day, so the same date always yields the same question. Adding or reordering a template changes which topic falls on a given day. That is expected.
- **Posts arrive at the wrong time.** Check `TZ_NAME` and `DAILY_CRON`. The cron runs in the configured timezone, not the host's.

## Backups

There is nothing to back up. The repo is the truth, and the bot keeps no state on disk.
