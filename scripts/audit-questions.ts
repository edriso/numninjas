/**
 * Template audit. Run with `pnpm audit-questions`.
 *
 * Questions are now GENERATED from parametric templates (src/content/
 * templates-*.ts), not a fixed bank, so this audit fuzzes every template
 * through many seeds and checks each generated question against the same rules
 * the runtime uses (src/lib/validate.ts): exactly four distinct, non-empty
 * options within Telegram's limits, a correctIndex that points at the answer,
 * an explanation within the quiz limit, no em-dashes, and a sane render budget.
 * It also checks that, across the fuzz, the correct answer does not bunch in one
 * position (which would let readers guess without doing the maths). Pure data
 * check, no network, no bot token. Exits 1 on any failure so it can gate CI.
 */
import { warmupTemplates } from '../src/content/templates-warmup';
import { challengeTemplates } from '../src/content/templates-challenge';
import { assembleQuestion } from '../src/lib/generate';
import { questionProblems } from '../src/lib/validate';
import { mulberry32 } from '../src/lib/rng';
import type { QuestionTemplate } from '../src/types';

// How many seeds to try per template. Each seed is a different "day", so this
// is far more coverage than a year of real posting.
const FUZZ_SEEDS = 3000;

let failures = 0;

function audit(templates: readonly QuestionTemplate[], label: string): void {
  const ids = new Set<string>();
  for (const template of templates) {
    if (ids.has(template.id)) {
      console.error(`  [${template.id}] duplicate template id`);
      failures++;
    }
    ids.add(template.id);

    const positions = [0, 0, 0, 0];
    for (let seed = 1; seed <= FUZZ_SEEDS; seed++) {
      const q = assembleQuestion(template, mulberry32(seed));
      positions[q.correctIndex] = (positions[q.correctIndex] ?? 0) + 1;
      const problems = questionProblems(q);
      if (problems.length > 0) {
        failures++;
        console.error(`  [${template.id}] seed ${seed}: ${problems.join('; ')}`);
        // One example per template is enough to start fixing; stop spamming.
        break;
      }
    }

    // The shuffle should land the answer in every position with rough balance.
    const max = Math.max(...positions);
    if (max / FUZZ_SEEDS > 0.4 || positions.some((p) => p === 0)) {
      failures++;
      console.error(`  [${template.id}] answer position not well spread: ${positions.join('/')}`);
    }
  }
  console.log(`${label}: ${templates.length} templates fuzzed x ${FUZZ_SEEDS} seeds.`);
}

audit(warmupTemplates, 'Warm-up ');
audit(challengeTemplates, 'Challenge');

if (failures === 0) {
  console.log('OK: all templates generate valid, well-spread questions.');
  process.exit(0);
}

console.error(`Found ${failures} issue(s).`);
process.exit(1);
