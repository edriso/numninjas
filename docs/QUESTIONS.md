# Adding and Editing Questions

Questions are no longer a fixed bank. Each day's question is **generated** from a
parametric **template** with fresh, day-seeded numbers, so the bot effectively
never repeats a question within a year while staying completely stateless. (See
`src/lib/generate.ts` and the "How generation works" section below.)

Templates live in two files:

- `src/content/templates-warmup.ts` (easy, confidence-building)
- `src/content/templates-challenge.ts` (a step harder)

The template `id` prefix must match the file: `warmup-...` or `challenge-...`.

## The shape

```ts
type QuestionTemplate = {
  id: string; // "warmup-add-two-items", unique within the file, carries the prefix
  difficulty: 'warmup' | 'challenge';
  topic: string; // short label shown in the message header
  generate: (rng: Rng) => GeneratedCore;
};

type GeneratedCore = {
  topic: string; // usually the template's topic
  scenario: string; // 1 to 2 sentences. A real-life situation a kid knows.
  prompt: string; // the actual question
  hint: string; // shown behind a Telegram spoiler tag
  answer: string; // the correct answer, formatted with its unit (e.g. "23 pounds")
  distractors: [string, string, string]; // three wrong answers, distinct from the answer
  explanation: string; // <= 200 chars. Shown when the reader votes.
};
```

The generator turns a `GeneratedCore` into a full question: it shuffles
`[answer, ...distractors]` into the four poll options (so the correct position
is spread across the year automatically) and records where the answer landed.
A template never sets a `correctIndex` itself.

`rng` is a deterministic generator (`src/lib/rng.ts`) with `int(min, max)`
(inclusive), `pick(array)`, and `shuffle(array)`. Never use `Math.random()`:
the whole bot is deterministic and restart-safe because every number comes from
the day's seed.

The exact numeric limits live in `src/lib/limits.ts` and are enforced by both
the audit and the validator (`src/lib/validate.ts`), so they cannot drift.

## Authoring checklist

1. **Make the scenario real.** Pocket money, sharing snacks, a school play, a bus, a recipe. Avoid abstract setups like "given a number n".
2. **Choose number ranges that stay friendly AND always clean.** Pick ranges so the answer is a whole, sensible value (no negative change, no fractional pence) for every draw. If a result must divide evenly, build it that way (e.g. pick the quotient and multiply back), do not divide and hope.
3. **Compute the answer in code, never hard-code it.** The template owns its own maths. Format it with its unit via `unit(n, 'pound')` (which gets the singular right: "1 pound", "23 pounds").
4. **Make distractors the real mistakes.** Pass the believable wrong turns to `wrongInts(correct, [...])`: adding when you should multiply, forgetting to carry, mixing up area and perimeter, off-by-one. `wrongInts` guarantees three distinct, non-negative integers, filling from nearby values if your candidates run short.
5. **One clear correct answer.** No "both A and C work". The options must all be different (the validator enforces this and the generator re-rolls a rare collision).
6. **Hint should nudge, not solve.** Point at the first step or the concept, not the answer.
7. **Explanation is short and shows the working.** "15 + 8 = 23 pounds" beats a paragraph. The Telegram limit is 200 characters.
8. **Keep answers short.** They go straight into the quiz poll, so each option must stay under 100 characters. Math answers fit easily.
9. **No em-dashes or en-dashes in any prose.** Use commas, colons, or two sentences. The audit and the validator enforce this.
10. **Plain, kind English.** Short sentences. Write the way you would explain it to a 10-year-old.

## After you edit

```bash
pnpm audit-questions      # fuzzes EVERY template through thousands of seeds
pnpm test                 # generates a full year and checks every invariant
pnpm send-test warmup     # preview today's generated warm-up in the channel
pnpm send-test challenge  # preview today's generated challenge in the channel
```

`pnpm audit-questions` is the important one: it runs each template through
thousands of different "days" and fails if any draw produces a duplicate option,
an over-long string, an em-dash, a bunched answer position, or anything else the
runtime would reject. If your template can ever go wrong, the audit finds the
seed that proves it. Both audit and test must pass before deploying.

## How generation works

- The template for the day is chosen by `dayOfYearIn(today, TZ) % templates.length`, so the topic rotates predictably through the file.
- The numbers come from a deterministic PRNG seeded from the **year + day-of-year + a per-difficulty salt**. So:
  - the same calendar day always produces the same question (a mid-day restart cannot re-roll it);
  - the numbers are fresh every day AND every year (no fixed annual question);
  - the warm-up and the challenge draw independent numbers on the same day.
- The generator validates each draw and re-rolls a rare bad one with a bumped seed (still deterministic), so a malformed question can never reach the channel.

## How many templates is enough

Because the numbers are generated, you do **not** need hundreds of questions to
fill a year. Each template is effectively infinite content; the number of
templates only sets how often a given **topic** comes round:

| Templates per file | Days until the same topic returns |
| ------------------ | --------------------------------- |
| 16                 | about every 2 weeks               |
| 30                 | about once a month                |
| 60                 | about once every 2 months         |

The topic returns on that cadence, but the actual numbers are different each
time, so a daily follower keeps getting fresh problems. Add a template whenever
you want a new kind of question; there is no upper bound.

## How many questions per day, and why two

This bot posts **two** questions, together, every **morning** (default 07:00). The warm-up goes out first, then the challenge. Here is the reasoning, so you can change it with eyes open.

- **Morning only, nothing at night.** Kids this age need good sleep and an early start more than they need an extra evening puzzle. Posting first thing rewards waking up early and keeps the channel away from bedtime entirely. A unit test even pins every fire to the 05:00 to 11:00 window so no one accidentally schedules a late-night post.
- **Two, not one.** Research on children aged 10 to 12 points one way: short, frequent practice beats one long block, and it fits their attention span (roughly 20 to 30 minutes at this age). Two 30-second puzzles, an easy warm-up to build confidence and a harder challenge to stretch, are a quick morning brain warm-up, not a study session.
- **Together, not spread out.** Both fire from a single cron so the whole "morning math" moment is one habit: open the channel once, do two puzzles, get on with your day.

How to change it:

- **Move the time:** set `DAILY_CRON` (or edit the default in `src/config.ts`). Keep it in the morning so the schedules test still passes.
- **Post only one a day:** in `src/scheduler.ts#runDailyQuestions`, drop one of the two `runQuestion(...)` calls. Everything else (the generator, the format, the tests) keeps working.
- **Split them across the day:** add a second entry to `schedules` in `src/schedules.ts`, then add a runner for it in the `runners` map in `src/scheduler.ts` keyed by the same `name`. A schedule with no matching runner is skipped at startup with a logged error, so it can never silently double-post. (You will also need to relax the morning-window test if you intentionally post later.)
