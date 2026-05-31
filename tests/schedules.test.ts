import { describe, expect, it } from 'vitest';
import cron from 'node-cron';
import { schedules } from '../src/schedules';

describe('schedules registry', () => {
  it('registers exactly three daily fires', () => {
    expect(schedules.length).toBe(3);
  });

  it('every cron expression is valid', () => {
    for (const s of schedules) {
      expect(cron.validate(s.cron), `${s.name}: ${s.cron}`).toBe(true);
    }
  });

  it('every schedule name is unique', () => {
    const names = schedules.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('contains both question difficulties and a check-in poll', () => {
    const questionDifficulties = schedules
      .filter((s) => s.kind === 'question')
      .map((s) => s.difficulty);
    expect(questionDifficulties).toContain('warmup');
    expect(questionDifficulties).toContain('challenge');
    expect(schedules.some((s) => s.kind === 'checkin_poll')).toBe(true);
  });

  it('never fires inside the 00:00..01:00 spring-forward gap', () => {
    // node-cron silently drops a job whose wall-clock time does not
    // exist on the spring-forward day. Keep every hour field >= 1.
    for (const s of schedules) {
      const hour = Number(s.cron.split(' ')[1]);
      expect(hour, `${s.name}: ${s.cron}`).toBeGreaterThanOrEqual(1);
    }
  });
});
