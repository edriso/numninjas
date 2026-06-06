import { dayOfYearIn } from 'telegram-broadcast-kit';
import type { Difficulty, Question, QuestionTemplate } from '../types';
import { warmupTemplates } from '../content/templates-warmup';
import { challengeTemplates } from '../content/templates-challenge';
import { mulberry32, seedFrom, type Rng } from './rng';
import { isValidQuestion, questionProblems } from './validate';

// The question engine. Instead of a fixed bank that repeats every ~month, each
// day's question is GENERATED from a template with fresh, day-seeded numbers.
// This keeps the bot's defining properties intact:
//   - No database, no state. The seed is derived purely from the calendar day
//     in the configured timezone, so the same day always yields the same
//     question and a mid-day redeploy cannot re-roll it.
//   - Deterministic and restart-safe, exactly like the old day-of-year picker.
// What changes: the NUMBERS are fresh every day and every year, so a follower
// effectively never meets the same question twice within a year, while the
// TOPIC still rotates predictably (nice structure for a learner).

function templatesFor(difficulty: Difficulty): readonly QuestionTemplate[] {
  return difficulty === 'warmup' ? warmupTemplates : challengeTemplates;
}

// A small per-difficulty salt so the warm-up and the challenge draw independent
// number streams on the same day (otherwise they would share a seed).
const SALT: Record<Difficulty, number> = { warmup: 0x5741524d, challenge: 0x4348414c };

/** The calendar year for a Date in a timezone (so the seed changes year over year). */
function yearIn(date: Date, timezone: string): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric' }).format(date),
  );
}

/** Assemble a template's core into a full Question: shuffle the four options
 *  (so the answer's position is spread across the year) and record where the
 *  answer landed. Exported so the audit and tests can fuzz a template directly
 *  with many seeds, exactly as the engine assembles it at runtime. */
export function assembleQuestion(template: QuestionTemplate, rng: Rng): Question {
  const core = template.generate(rng);
  const options = rng.shuffle([core.answer, ...core.distractors]);
  const correctIndex = options.indexOf(core.answer) as 0 | 1 | 2 | 3;
  return {
    id: template.id,
    difficulty: template.difficulty,
    topic: core.topic,
    scenario: core.scenario,
    prompt: core.prompt,
    hint: core.hint,
    options: options as [string, string, string, string],
    correctIndex,
    explanation: core.explanation,
  };
}

/**
 * The question for a given difficulty on a given day. The template rotates by
 * day-of-year; its numbers come from a seed folding year + day + difficulty, so
 * they are fresh each day and each year yet fully deterministic.
 *
 * A template should produce a well-formed question by construction, but to be
 * safe against a rare unlucky draw (e.g. two distractors that happen to render
 * the same) the engine re-rolls with a bumped seed until the question validates,
 * which stays deterministic (the same day always walks the same re-roll path).
 */
export function generateQuestion(difficulty: Difficulty, date: Date, timezone: string): Question {
  const templates = templatesFor(difficulty);
  if (templates.length === 0) throw new Error(`No templates for difficulty "${difficulty}"`);

  const doy = dayOfYearIn(date, timezone);
  const year = yearIn(date, timezone);
  const template = templates[(doy - 1) % templates.length] as QuestionTemplate;

  const MAX_ATTEMPTS = 50;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = mulberry32(seedFrom(year, doy, SALT[difficulty], attempt));
    const question = assembleQuestion(template, rng);
    if (isValidQuestion(question)) return question;
  }
  // Unreachable in practice: a template that cannot produce a valid question in
  // 50 tries is an authoring bug, caught by the audit and the test fuzz. Fail
  // loudly rather than post something malformed.
  const rng = mulberry32(seedFrom(year, doy, SALT[difficulty], 0));
  const problems = questionProblems(assembleQuestion(template, rng));
  throw new Error(
    `Template "${template.id}" could not generate a valid question: ${problems.join('; ')}`,
  );
}
