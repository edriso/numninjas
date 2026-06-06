import type { Question } from '../types';

/**
 * Escape user-controlled text for Telegram HTML parse_mode. Only three
 * characters are special: < > &. Everything else is literal. Math text
 * sometimes uses "<" or ">" (e.g. "3 < 5"), so this escaping matters.
 */
export function htmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const DIFF_BADGE: Record<Question['difficulty'], string> = {
  warmup: '🟢 Warm-up',
  challenge: '🔥 Challenge',
};

/**
 * Build the context message that comes right before the poll. It gives
 * the reader the whole word problem in one friendly block: a difficulty
 * badge, the topic, the real-life scenario, the question, and a hint
 * hidden behind a Telegram spoiler so a stuck reader can peek without
 * being handed the answer.
 *
 * The answer choices are NOT in this message. They live in the quiz
 * poll just below, where the reader taps the one they think is right.
 * Math answers are short, so they fit Telegram's poll options directly.
 *
 * Returned text uses HTML parse_mode.
 */
export function formatContextMessage(q: Question): string {
  const badge = DIFF_BADGE[q.difficulty];
  const topic = htmlEscape(q.topic);
  const scenario = htmlEscape(q.scenario);
  const prompt = htmlEscape(q.prompt);
  const hint = htmlEscape(q.hint);

  const lines: string[] = [
    `${badge} <b>NumNinjas 🥷</b> | <i>${topic}</i>`,
    '',
    scenario,
    '',
    `<b>❓ ${prompt}</b>`,
    '',
    `💡 <b>Hint</b>: <tg-spoiler>${hint}</tg-spoiler>`,
    '',
    '<i>Tap your answer in the poll just below ☟</i>',
  ];

  return lines.join('\n');
}

// The poll's question and options stay plain (no bidi marks here). Telegram
// renders poll text as plain text with no parse_mode, which would mirror our
// English content for a reader whose client base direction is RTL: "1 sweet"
// flips to "sweet 1", and "Which answer is correct? 🥷" to
// "🥷 ?Which answer is correct". The fix is to tell the kit the content is
// left-to-right (`direction: 'ltr'` on the sendPoll spec in scheduler.ts); the
// kit then wraps each string in an LTR bidi isolate. We keep that one concern
// at the send call rather than baking isolates into these strings.

/**
 * The quiz poll's question line. Kept short and friendly because the
 * full word problem is already in the context message right above it.
 */
export function pollQuestion(): string {
  return 'Which answer is correct? 🥷';
}

/**
 * The quiz poll's options: the four real answers for this question, in
 * the same order as `options` so `correctIndex` still points at the
 * right one. Math answers are short and stay under Telegram's 100-char
 * poll-option limit (enforced by the audit and the tests).
 */
export function pollOptions(q: Question): [string, string, string, string] {
  return q.options;
}
