# Deployment

This bot is small. It runs anywhere Node 20 runs: Fly.io, Railway, Render, a VPS, a Docker container, or your laptop. There is no database and no migrations.

The bot keeps one tiny JSON pointer file on disk (default `./data/last-message-ids.json`) to remember the previous check-in poll's message id so it can be deleted on the next fire. On a host with a persistent disk (Fly volume, Railway volume, VPS) this works across restarts. On an ephemeral host the file is wiped on every redeploy; the bot still works, you will just see one extra stale poll per redeploy until the next fire writes a new pointer.

## What you need

1. A Telegram bot from `@BotFather`. Save the token.
2. A Telegram channel where the bot is an admin with **Post messages** AND **Delete messages** permissions. Post is required; delete is needed so the check-in poll can replace the previous one. Without delete the bot still posts but the cleanup logs a warning and stale polls pile up.
3. The channel id. Easiest path: forward a channel message to `@RawDataBot` or `@JsonDumpBot` and read `chat.id`. It looks like `-1001234567890`. The numeric id is preferred; it survives a username change.

## Environment variables

| Variable             | Required | Notes                                                          |
| -------------------- | -------- | -------------------------------------------------------------- |
| `BOT_TOKEN`          | yes      | From `@BotFather`.                                             |
| `CHANNEL_CHAT_ID`    | yes      | Numeric `-100...` is best; `@channel` also works.              |
| `CHANNEL_PUBLIC_URL` | no       | Public link shown by `/start` in DMs.                          |
| `ADMIN_TELEGRAM_ID`  | no       | Unlocks `/admin_warmup`, `/admin_challenge`, `/admin_checkin`. |
| `TZ_NAME`            | no       | Cron timezone. Default UTC; the example sets Africa/Cairo.     |
| `WARMUP_CRON`        | no       | Override the warm-up cron (default `0 15 * * *`).              |
| `CHECKIN_POLL_CRON`  | no       | Override the check-in poll cron (default `30 17 * * *`).       |
| `CHALLENGE_CRON`     | no       | Override the challenge cron (default `30 19 * * *`).           |
| `STATE_FILE`         | no       | Pointer file path. Default `./data/last-message-ids.json`.     |
| `PORT`               | no       | `/health` server port. Default 8080.                           |
| `NODE_ENV`           | no       | `production` for hosted.                                       |

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

## Smoke test the schedules

```bash
pnpm send-test warmup      # fires today's warm-up question to the channel now
pnpm send-test challenge   # fires today's challenge question
pnpm send-test both
```

The script preflights `getChat` first, so if the token is wrong or the channel id is bad, you get one clean error instead of two confusing ones.

For the check-in poll, the easiest preview is the admin command in DM. After you set `ADMIN_TELEGRAM_ID` and grant the bot "Delete messages" rights, send `/admin_checkin` to the bot in a DM and watch the channel.

## Hosting recipes

### Fly.io

```bash
fly launch --no-deploy             # answer the prompts; pick a region near your audience
fly secrets set BOT_TOKEN=... CHANNEL_CHAT_ID=... TZ_NAME=Africa/Cairo
fly deploy
fly logs
```

Compile first and run `node dist/src/index.js`, or run `node --import tsx src/index.ts`. The `/health` endpoint on port 8080 keeps the machine alive.

### Railway

1. Create a new project from this repo.
2. Add the env vars in the dashboard.
3. Set the start command to `pnpm start` (build first) or `pnpm dev` for hot reload (not recommended in prod).
4. Done.

### Plain VPS

```bash
pnpm install --prod
pnpm build
pnpm start
```

Wrap it in a systemd unit or pm2 so it restarts on crash. Set the env vars in the unit file or in a `.env` next to the binary.

### Docker

A minimal Dockerfile:

```Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile || pnpm install
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "--import", "tsx", "dist/src/index.js"]
```

The image is a few hundred MB. There is nothing to mount; logs go to stdout.

## Verifying it works

1. Check `/health` returns 200 with `{"ok":true,"schedules":3,...}`.
2. Tail the logs for `Schedule registered` lines at startup (you should see three: warm-up, check-in poll, challenge).
3. Send `/start` to the bot in DM; you should get a welcome reply pointing at the channel.
4. Use `pnpm send-test warmup` to verify the question channel post end to end.
5. Send `/admin_checkin` from your admin DM to verify the check-in poll posts AND deletes the previous one.
6. Wait for the cron to fire at the scheduled times. The first real fire is the final test.

## What to do when something breaks

- **No post arrived.** Check the logs for `Schedule fired` then `Failed to post`. The most common cause is the bot is not an admin in the channel or "Post messages" is off.
- **403 from Telegram on send.** Bot is not a channel admin, or "Post messages" is off.
- **Warning "Failed to delete previous channel message".** Bot is missing the "Delete messages" admin right. Add it and the cleanup resumes from the next fire.
- **Polls pile up after each redeploy.** The state file lives at `./data/last-message-ids.json` by default. Persist it to a volume, or set `STATE_FILE` to a path that survives redeploys. Without it, every redeploy starts with an empty pointer, so the first fire after each redeploy will not delete anything.
- **400 "message is too long".** A question exceeded 4096 chars. Run `pnpm audit-questions`; the render budget check should catch it first.
- **Wrong question for today.** The picker is deterministic per date and pool length. Adding a new question shifts the cycle. That is expected.

## Backups

There is nothing important to back up. The repo is the truth. The state file is a soft pointer; losing it just means one extra stale poll per fresh start.
