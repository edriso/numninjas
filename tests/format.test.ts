import { describe, expect, it } from 'vitest';
import { formatContextMessage, htmlEscape, pollOptions, pollQuestion } from '../src/lib/format';
import { warmupQuestions } from '../src/content/questions-warmup';
import { challengeQuestions } from '../src/content/questions-challenge';

describe('htmlEscape', () => {
  it('escapes the three HTML-special characters', () => {
    expect(htmlEscape('a<b>c&d')).toBe('a&lt;b&gt;c&amp;d');
  });

  it('escapes a math comparison like 3 < 5', () => {
    expect(htmlEscape('3 < 5')).toBe('3 &lt; 5');
  });

  it('leaves quotes alone (Telegram HTML treats them as plain text)', () => {
    expect(htmlEscape(`it's "ok"`)).toBe(`it's "ok"`);
  });
});

describe('formatContextMessage', () => {
  const q = warmupQuestions[0]!;

  it('contains the brand, topic, scenario, and prompt', () => {
    const out = formatContextMessage(q);
    expect(out).toContain('NumNinjas');
    expect(out).toContain(q.topic);
    expect(out).toContain(q.scenario);
    expect(out).toContain(q.prompt);
  });

  it('hides the hint behind a Telegram spoiler tag', () => {
    const out = formatContextMessage(q);
    expect(out).toContain('<tg-spoiler>');
    expect(out).toContain('</tg-spoiler>');
    expect(out).toContain(q.hint);
  });

  it('does not leak the answer options into the context message', () => {
    // Options live in the poll, not the message. The correct option text
    // should not appear in the message (otherwise the quiz is spoiled).
    const out = formatContextMessage(q);
    expect(out).not.toContain(q.options[q.correctIndex]!);
  });

  it('never leaks the explanation (the "why") before the reader votes', () => {
    // The explanation is revealed by Telegram only after voting. It must
    // never appear in the context message for any question in either pool.
    // (We check the explanation rather than the raw option text because a
    // few questions, like "which is larger, 2/3 or 3/5?", legitimately
    // restate a value in the prompt itself.)
    for (const item of [...warmupQuestions, ...challengeQuestions]) {
      expect(formatContextMessage(item), item.id).not.toContain(item.explanation);
    }
  });

  it('shows the right difficulty badge', () => {
    expect(formatContextMessage(warmupQuestions[0]!)).toContain('Warm-up');
    expect(formatContextMessage(challengeQuestions[0]!)).toContain('Challenge');
  });

  it('stays well under the Telegram message limit of 4096', () => {
    for (const item of [...warmupQuestions, ...challengeQuestions]) {
      expect(formatContextMessage(item).length, item.id).toBeLessThan(4096);
    }
  });
});

describe('poll helpers', () => {
  it('returns a short poll question well under the 300-char limit', () => {
    expect(pollQuestion().length).toBeLessThan(300);
  });

  it('returns the four real answer options verbatim, in order', () => {
    // The strings stay plain here; the kit applies the LTR bidi isolate at
    // send time (direction: 'ltr' in scheduler.ts), so these must NOT carry
    // any directional marks of their own.
    const q = warmupQuestions[0]!;
    expect(pollOptions(q)).toEqual(q.options);
    expect(pollOptions(q).length).toBe(4);
  });

  it('keeps every poll string free of bidi control characters (the kit adds them)', () => {
    // LRM/RLM (U+200E/F), the embeddings/overrides/PDF (U+202A-U+202E), and the
    // isolates (U+2066-U+2069) are exactly the directional formatting
    // characters the kit may add; none should already be present in our source.
    const isBidiControl = (s: string) =>
      [...s].some((ch) => {
        const cp = ch.codePointAt(0)!;
        return (
          cp === 0x200e ||
          cp === 0x200f ||
          (cp >= 0x202a && cp <= 0x202e) ||
          (cp >= 0x2066 && cp <= 0x2069)
        );
      });
    expect(isBidiControl(pollQuestion())).toBe(false);
    for (const item of [...warmupQuestions, ...challengeQuestions]) {
      for (const opt of pollOptions(item)) {
        expect(isBidiControl(opt), item.id).toBe(false);
      }
    }
  });
});
