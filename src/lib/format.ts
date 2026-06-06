import { ltrIsolate } from 'telegram-broadcast-kit';
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

// Telegram renders a poll's question and options as plain text with no
// parse_mode, so it picks the base direction from the *reader's* app language,
// not from the text. A follower whose Telegram is set to an RTL language
// (Arabic, Hebrew, ...) sees our English polls mirrored: "Which answer is
// correct? 🥷" becomes "🥷 ?Which answer is correct", and an option like
// "1 sweet" flips to "sweet 1". A leading LRM cannot fix this (the base
// direction is forced by locale, not inferred from the first strong
// character); only an explicit isolate overrides it. The kit's ltrIsolate
// wraps the string in LRI ... PDI to pin it left-to-right for every reader,
// which is what English math content wants. The HTML context message above
// the poll is unaffected (Telegram messages infer direction from content), so
// only these poll strings need it.

/**
 * The quiz poll's question line. Kept short and friendly because the
 * full word problem is already in the context message right above it.
 * Pinned left-to-right so it never mirrors for readers on an RTL locale.
 */
export function pollQuestion(): string {
  return ltrIsolate('Which answer is correct? 🥷');
}

/**
 * The quiz poll's options: the four real answers for this question, in
 * the same order as `options` so `correctIndex` still points at the
 * right one. Math answers are short and stay under Telegram's 100-char
 * poll-option limit (enforced by the audit and the tests). Each option is
 * pinned left-to-right so number-first answers like "1 sweet" do not flip to
 * "sweet 1" on an RTL locale. The isolate adds two characters, which keeps
 * the longest option (well under 100) comfortably within the limit.
 */
export function pollOptions(q: Question): [string, string, string, string] {
  return q.options.map(ltrIsolate) as [string, string, string, string];
}
