import { describe, expect, it } from 'vitest';
import { CHECKIN_POLL } from '../src/content/checkin-poll';

const POLL_QUESTION_MAX = 300;
const POLL_OPTION_MAX = 100;

describe('check-in poll', () => {
  it('has a question within the Telegram poll limit', () => {
    expect(CHECKIN_POLL.question.length).toBeGreaterThan(0);
    expect(CHECKIN_POLL.question.length).toBeLessThanOrEqual(POLL_QUESTION_MAX);
  });

  it('has exactly two options, each within the poll limit', () => {
    expect(CHECKIN_POLL.options.length).toBe(2);
    for (const opt of CHECKIN_POLL.options) {
      expect(opt.length).toBeGreaterThan(0);
      expect(opt.length).toBeLessThanOrEqual(POLL_OPTION_MAX);
    }
  });

  it('has a sane auto-close window (closes before the next daily fire)', () => {
    expect(CHECKIN_POLL.closeAfterHours).toBeGreaterThan(0);
    expect(CHECKIN_POLL.closeAfterHours).toBeLessThan(24);
  });
});
