import type { Question } from '../types';
import {
  EXPLANATION_MAX_CHARS,
  MESSAGE_BUDGET_CHARS,
  OPTION_MAX_CHARS,
  QUESTION_MAX_CHARS,
} from './limits';

// The single source of truth for "is this question well-formed". Used three
// ways: the generator (src/lib/generate.ts) calls it to re-roll the rare bad
// draw before it ever posts; the audit script fuzzes every template through it;
// and the tests assert it over a full year of generated questions. Keeping the
// rules in one place means those three can never drift apart.

/**
 * Return a list of human-readable problems with a question. An empty list means
 * the question is well-formed (valid options, indices, lengths, no dashes, and
 * within the render budget). The id prefix is checked against the difficulty.
 */
export function questionProblems(q: Question): string[] {
  const problems: string[] = [];

  const prefix = q.difficulty === 'warmup' ? 'warmup-' : 'challenge-';
  if (!q.id.startsWith(prefix)) problems.push(`id "${q.id}" must start with "${prefix}"`);

  if (q.options.length !== 4)
    problems.push(`must have exactly 4 options, found ${q.options.length}`);
  q.options.forEach((opt, i) => {
    if (opt.trim().length === 0) problems.push(`options[${i}] is empty`);
    if (opt.length > OPTION_MAX_CHARS) {
      problems.push(`options[${i}] length ${opt.length} > ${OPTION_MAX_CHARS}`);
    }
  });
  if (new Set(q.options).size !== q.options.length) problems.push('options must all be different');

  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) {
    problems.push(`correctIndex out of range: ${q.correctIndex}`);
  } else if ((q.options[q.correctIndex] ?? '').trim().length === 0) {
    problems.push('correctIndex points at an empty option');
  }

  if (q.explanation.length > EXPLANATION_MAX_CHARS) {
    problems.push(`explanation length ${q.explanation.length} > ${EXPLANATION_MAX_CHARS}`);
  }
  if (q.prompt.length > QUESTION_MAX_CHARS) {
    problems.push(`prompt length ${q.prompt.length} > ${QUESTION_MAX_CHARS}`);
  }

  for (const [field, value] of [
    ['topic', q.topic],
    ['scenario', q.scenario],
    ['prompt', q.prompt],
    ['hint', q.hint],
    ['explanation', q.explanation],
  ] as const) {
    if (!value || value.trim().length === 0) problems.push(`${field} is empty`);
    if (value.includes('—') || value.includes('–')) {
      problems.push(`${field} has an em-dash or en-dash`);
    }
  }

  const totalText =
    q.scenario.length +
    q.prompt.length +
    q.hint.length +
    q.options.reduce((sum, o) => sum + o.length, 0);
  if (totalText > MESSAGE_BUDGET_CHARS) {
    problems.push(`total text ${totalText} > ${MESSAGE_BUDGET_CHARS}`);
  }

  return problems;
}

/** True when the question has no problems. */
export function isValidQuestion(q: Question): boolean {
  return questionProblems(q).length === 0;
}
