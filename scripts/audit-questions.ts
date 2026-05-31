/**
 * Question-pool sanity checker. Run with `pnpm audit-questions`.
 *
 * Catches the kinds of mistakes the runtime will not: a duplicate id, an
 * option longer than Telegram's poll-option limit, an explanation over
 * the 200-char quiz limit, a correctIndex out of range, or a correct
 * answer that is always in the same position (which would let readers
 * guess without thinking). Pure data check, no network, no bot token
 * needed. Exits with code 1 on any failure so it can be wired into CI.
 */
import { warmupQuestions } from '../src/content/questions-warmup';
import { challengeQuestions } from '../src/content/questions-challenge';
import type { Question } from '../src/types';
import {
  EXPLANATION_MAX_CHARS,
  MESSAGE_BUDGET_CHARS,
  OPTION_MAX_CHARS,
  QUESTION_MAX_CHARS,
} from '../src/lib/limits';

type Issue = { id: string; field: string; detail: string };
const issues: Issue[] = [];

function check(qs: readonly Question[], prefix: 'warmup-' | 'challenge-'): void {
  const seenIds = new Set<string>();
  for (const q of qs) {
    if (!q.id.startsWith(prefix)) {
      issues.push({ id: q.id, field: 'id', detail: `must start with "${prefix}"` });
    }
    if (seenIds.has(q.id)) {
      issues.push({ id: q.id, field: 'id', detail: 'duplicate id' });
    }
    seenIds.add(q.id);

    if (q.options.length !== 4) {
      issues.push({
        id: q.id,
        field: 'options',
        detail: `must have exactly 4, found ${q.options.length}`,
      });
    }
    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i] ?? '';
      if (opt.trim().length === 0) {
        issues.push({ id: q.id, field: `options[${i}]`, detail: 'empty' });
      }
      if (opt.length > OPTION_MAX_CHARS) {
        issues.push({
          id: q.id,
          field: `options[${i}]`,
          detail: `length ${opt.length} > ${OPTION_MAX_CHARS}`,
        });
      }
    }
    // Duplicate options would make a question ambiguous (two "correct"
    // looking taps), so flag them.
    if (new Set(q.options).size !== q.options.length) {
      issues.push({ id: q.id, field: 'options', detail: 'options must all be different' });
    }
    if (q.correctIndex < 0 || q.correctIndex > 3) {
      issues.push({ id: q.id, field: 'correctIndex', detail: `out of range: ${q.correctIndex}` });
    }
    if (q.explanation.length > EXPLANATION_MAX_CHARS) {
      issues.push({
        id: q.id,
        field: 'explanation',
        detail: `length ${q.explanation.length} > ${EXPLANATION_MAX_CHARS}`,
      });
    }
    if (q.prompt.length > QUESTION_MAX_CHARS) {
      issues.push({
        id: q.id,
        field: 'prompt',
        detail: `length ${q.prompt.length} > ${QUESTION_MAX_CHARS}`,
      });
    }
    if (!q.hint || q.hint.trim().length === 0) {
      issues.push({ id: q.id, field: 'hint', detail: 'empty' });
    }
    if (!q.scenario || q.scenario.trim().length === 0) {
      issues.push({ id: q.id, field: 'scenario', detail: 'empty' });
    }
    if (!q.explanation || q.explanation.trim().length === 0) {
      issues.push({ id: q.id, field: 'explanation', detail: 'empty' });
    }
    // Em-dashes read as machine-generated and look out of place in a
    // kids' learning channel. Keep prose to commas, colons, and full
    // stops. See docs/QUESTIONS.md.
    const proseFields: Array<[string, string]> = [
      ['scenario', q.scenario],
      ['prompt', q.prompt],
      ['hint', q.hint],
      ['explanation', q.explanation],
    ];
    for (const [field, value] of proseFields) {
      if (value.includes('—') || value.includes('–')) {
        issues.push({ id: q.id, field, detail: 'no em-dashes or en-dashes in prose' });
      }
    }
    // Defensive check that the rendered message will not blow Telegram's
    // 4096-char sendMessage cap. The raw text fields dominate; staying
    // under MESSAGE_BUDGET_CHARS leaves comfortable headroom.
    const totalText =
      q.scenario.length +
      q.prompt.length +
      q.hint.length +
      q.options.reduce((sum, o) => sum + o.length, 0);
    if (totalText > MESSAGE_BUDGET_CHARS) {
      issues.push({
        id: q.id,
        field: 'total text',
        detail: `length ${totalText} > ${MESSAGE_BUDGET_CHARS}`,
      });
    }
  }
}

/**
 * The correct answer should not sit in the same position too often, or
 * readers learn to guess "always B" instead of doing the math. Warn (do
 * not fail) if any single position holds more than 45% of the answers.
 */
function checkAnswerSpread(qs: readonly Question[], label: string): void {
  const counts = [0, 0, 0, 0];
  for (const q of qs) counts[q.correctIndex] = (counts[q.correctIndex] ?? 0) + 1;
  const max = Math.max(...counts);
  if (qs.length > 0 && max / qs.length > 0.45) {
    console.warn(
      `WARN [${label}]: answers are bunched in one position (${counts.join('/')}). Spread them out.`,
    );
  }
}

check(warmupQuestions, 'warmup-');
check(challengeQuestions, 'challenge-');
checkAnswerSpread(warmupQuestions, 'warmup');
checkAnswerSpread(challengeQuestions, 'challenge');

console.log(`Warm-up questions:   ${warmupQuestions.length}`);
console.log(`Challenge questions: ${challengeQuestions.length}`);

if (issues.length === 0) {
  console.log('OK: all questions pass the audit.');
  process.exit(0);
}

console.error(`Found ${issues.length} issue(s):`);
for (const i of issues) {
  console.error(`  [${i.id}] ${i.field}: ${i.detail}`);
}
process.exit(1);
