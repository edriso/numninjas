import { describe, expect, it } from 'vitest';
import cron from 'node-cron';
import { schedules } from '../src/schedules';
import { runners, dailyBatch } from '../src/scheduler';

describe('schedules registry', () => {
  it('has at least one daily fire', () => {
    expect(schedules.length).toBeGreaterThan(0);
  });

  it('every schedule has a matching runner', () => {
    // Guards the footgun: a schedule entry with no runner would be
    // skipped at startup. This fails the build the moment that happens.
    for (const s of schedules) {
      expect(typeof runners[s.name], `no runner for "${s.name}"`).toBe('function');
    }
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

describe('daily batch notifications', () => {
  it('posts the warm-up first, then the challenge', () => {
    expect(dailyBatch.map((b) => b.difficulty)).toEqual(['warmup', 'challenge']);
  });

  it('rings exactly once a day: only the last item is audible', () => {
    const audible = dailyBatch.filter((b) => !b.silent);
    expect(audible).toHaveLength(1);
    // The single audible poll must be the last item, so the notification
    // lands on the final message in the morning feed.
    expect(audible[0]).toBe(dailyBatch[dailyBatch.length - 1]);
  });
});
