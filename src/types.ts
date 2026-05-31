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
