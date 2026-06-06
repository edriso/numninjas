import type { Rng } from './lib/rng';

export type Difficulty = 'warmup' | 'challenge';

/**
 * One math question for kids aged 10 to 12. The content fields are the
 * source of truth and live in src/content/questions-*.ts. Each question
 * renders as two posts in the channel:
 *
 *   1. A context message: a short real-life scenario, the question, and
 *      a hint hidden behind a Telegram spoiler tag so a stuck reader can
 *      reveal a nudge without seeing the answer.
 *   2. A quiz poll replying to that message. The four answer options are
 *      the real choices (e.g. "23 pounds"), not letters, because math
 *      answers are short and fit Telegram's 100-char poll-option limit.
 *      Telegram reveals the correct option and the explanation after the
 *      reader votes.
 *
 * Constraints (validated by scripts/audit-questions.ts and unit tests,
 * limits live in src/lib/limits.ts):
 *  - `options` is exactly 4 entries, each non-empty and <= 100 chars
 *  - `correctIndex` is 0..3
 *  - `explanation` is <= 200 chars (Telegram quiz-poll limit)
 *  - `id` is unique and starts with the difficulty prefix
 *    ("warmup-" or "challenge-")
 */
export type Question = {
  id: string;
  difficulty: Difficulty;
  /** Short label shown in the message header, e.g. "Multiplication". */
  topic: string;
  /** One or two sentences. A real-life situation a kid would recognise. */
  scenario: string;
  /** The actual question the reader must answer. */
  prompt: string;
  /** A gentle nudge, hidden behind a spoiler. Points at the idea, not the answer. */
  hint: string;
  /** Exactly four answer choices. These appear directly in the quiz poll. */
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  /** Shown by Telegram after the reader votes. Keep it short and clear. */
  explanation: string;
};

/**
 * The fresh-numbers core a template produces for one day. The generator
 * (src/lib/generate.ts) turns this into a full {@link Question}: it shuffles
 * `[answer, ...distractors]` into the four poll options and records where the
 * answer landed, so the correct position is spread across the year for free.
 *
 * A template OWNS its own correctness: it computes `answer` and picks
 * `distractors` that are believable wrong turns (the actual mistakes a kid
 * makes), all distinct from the answer and from each other. The generator only
 * validates and re-rolls on the rare bad draw; it never invents answers.
 */
export type GeneratedCore = {
  /** Short header label, e.g. "Multiplication". Usually the template's topic. */
  topic: string;
  scenario: string;
  prompt: string;
  hint: string;
  /** The correct answer, already formatted with any unit (e.g. "23 pounds"). */
  answer: string;
  /** Exactly three wrong answers, distinct from `answer` and each other. */
  distractors: [string, string, string];
  explanation: string;
};

/**
 * A parametric question template. `generate` draws this day's numbers from the
 * (deterministic, day-seeded) `rng` and returns the {@link GeneratedCore}. The
 * `id` carries the difficulty prefix ("warmup-" / "challenge-") and names the
 * template, not a single question (there is no longer a fixed bank).
 */
export type QuestionTemplate = {
  id: string;
  difficulty: Difficulty;
  topic: string;
  generate: (rng: Rng) => GeneratedCore;
};
