# Adding and Editing Questions

Questions are plain TypeScript objects in two files:

- `src/content/questions-warmup.ts` (easy, confidence-building)
- `src/content/questions-challenge.ts` (a step harder)

The id prefix must match the file: `warmup-...` or `challenge-...`.

## The shape

```ts
type Question = {
  id: string; // "warmup-something-short", unique across both pools
  difficulty: 'warmup' | 'challenge';
  topic: string; // short label shown in the message header
  scenario: string; // 1 to 2 sentences. A real-life situation a kid knows.
  prompt: string; // the actual question
  hint: string; // shown behind a Telegram spoiler tag
  options: [string, string, string, string]; // exactly 4 answer choices
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string; // 200 chars max. Shown when the reader votes.
};
```

The exact numeric limits live in `src/lib/limits.ts` and are imported by both the audit script and the test suite, so they cannot drift.

## Authoring checklist

1. **Make the scenario real.** Pocket money, sharing snacks, a school play, a football match, a bus, a recipe. Avoid abstract setups like "given a number n".
2. **Keep the numbers friendly.** Round, small, and easy to picture. The point is the idea, not heavy arithmetic.
3. **Hint should nudge, not solve.** Point at the first step or the concept, not the answer. Example: "There are 100 cm in 1 metre" is a great hint for a cm-to-metres question.
4. **Write four believable options.** The three wrong ones should be the mistakes a kid actually makes: adding when they should multiply, forgetting to carry, mixing up area and perimeter, or comparing decimals wrongly (0.65 looking bigger than 0.7).
5. **One clear correct answer.** No "both A and C work". Options must all be different (the audit enforces this).
6. **Spread the correct answer around.** Do not always make the first option correct. Mix `correctIndex` across 0, 1, 2, and 3. The audit warns and a test fails if answers bunch in one position.
7. **Explanation is short and shows the working.** "15 + 8 = 23 pounds" beats a paragraph. The Telegram limit is 200 characters.
8. **Keep answers short.** They go straight into the quiz poll, so each option must stay under 100 characters. Math answers fit easily.
9. **No em-dashes or en-dashes in any prose.** Use commas, colons, or two sentences. Dashes read as machine-generated and look out of place in a kids' channel. The audit and a test enforce this.
10. **Plain, kind English.** Short sentences. No idioms, no "utilize" or "as per". Write the way you would explain it to a 10-year-old.

## After you edit

```bash
pnpm audit-questions      # validates lengths, ids, indices, answer spread
pnpm test                 # runs the same checks plus picker and format tests
pnpm send-test warmup     # preview today's warm-up question in the channel
pnpm send-test challenge  # preview today's challenge question in the channel
```

Both audit and test must pass before deploying.

## Picking is by day of year

The bot uses `dayOfYearInTimezone(today, TZ) % pool.length` to pick. That means:

- Adding a question shifts the cycle by one position for every day after the new entry. That is fine for a daily channel. Readers will not notice.
- Do not try to pin a question to a specific date. Keep the pool flat and let the rotation do its job.

## How many questions per day, and why two

This bot posts **two** questions, together, every **morning** (default 07:00). The warm-up goes out first, then the challenge. Here is the reasoning, so you can change it with eyes open.

- **Morning only, nothing at night.** Kids this age need good sleep and an early start more than they need an extra evening puzzle. Posting first thing rewards waking up early and keeps the channel away from bedtime entirely. A unit test even pins every fire to the 05:00 to 11:00 window so no one accidentally schedules a late-night post.
- **Two, not one.** Research on children aged 10 to 12 points one way: short, frequent practice beats one long block, and it fits their attention span (roughly 20 to 30 minutes at this age). Two 30-second puzzles, an easy warm-up to build confidence and a harder challenge to stretch, are a quick morning brain warm-up, not a study session.
- **Together, not spread out.** Both fire from a single cron so the whole "morning math" moment is one habit: open the channel once, do two puzzles, get on with your day.

How to change it:

- **Move the time:** set `DAILY_CRON` (or edit the default in `src/config.ts`). Keep it in the morning so the schedules test still passes.
- **Post only one a day:** in `src/scheduler.ts#runDailyQuestions`, drop one of the two `runQuestion(...)` calls. Everything else (the picker, the format, the tests) keeps working.
- **Split them across the day:** add a second entry to `schedules` in `src/schedules.ts` and give the scheduler a second runner. (You will also need to relax the morning-window test if you intentionally post later.)

## How many questions is enough content

The picker cycles through the pool, so the cycle length equals the pool size. As a rule of thumb:

| Pool size | Days until a repeat for that slot |
| --------- | --------------------------------- |
| 30        | about a month                     |
| 60        | about two months                  |
| 90        | about three months                |
| 180       | about six months                  |

The project ships with about 30 in each pool, which gives roughly a month of unique content per slot. Add more whenever you have a good idea. There is no upper bound.
