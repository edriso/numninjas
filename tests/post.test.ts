import { describe, expect, it } from 'vitest';
import { clampCloseHours, MAX_CLOSE_HOURS, MIN_CLOSE_HOURS } from '../src/lib/post';

describe('clampCloseHours', () => {
  it('leaves a normal duration untouched', () => {
    expect(clampCloseHours(22)).toBe(22);
  });

  it('raises a too-short duration to the Telegram minimum', () => {
    // Telegram rejects a quiz poll that closes in under 5 seconds.
    expect(clampCloseHours(0)).toBe(MIN_CLOSE_HOURS);
    expect(clampCloseHours(-100)).toBe(MIN_CLOSE_HOURS);
  });

  it('caps a too-long duration at the Telegram maximum', () => {
    // Telegram rejects a close date more than ~30 days out.
    expect(clampCloseHours(100_000)).toBe(MAX_CLOSE_HOURS);
  });

  it('keeps the bounds themselves', () => {
    expect(clampCloseHours(MIN_CLOSE_HOURS)).toBe(MIN_CLOSE_HOURS);
    expect(clampCloseHours(MAX_CLOSE_HOURS)).toBe(MAX_CLOSE_HOURS);
  });
});
