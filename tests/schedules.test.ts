import { describe, expect, it } from 'vitest';
import cron from 'node-cron';
import { schedules } from '../src/schedules';

describe('schedules registry', () => {
  it('has at least one daily fire', () => {
    expect(schedules.length).toBeGreaterThan(0);
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

  it('fires in the early morning, never at night', () => {
    // The product rule: post in the morning so the channel rewards
    // waking early and never competes with bedtime. Every fire must land
    // between 05:00 and 11:00. (This also keeps the hour >= 1, clear of
    // the 00:00..01:00 spring-forward gap that node-cron silently skips.)
    for (const s of schedules) {
      const hour = Number(s.cron.split(' ')[1]);
      expect(hour, `${s.name}: ${s.cron}`).toBeGreaterThanOrEqual(5);
      expect(hour, `${s.name}: ${s.cron}`).toBeLessThanOrEqual(11);
    }
  });
});
