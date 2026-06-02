import { describe, expect, it } from 'vitest';
import { channelUrlFrom } from '../src/config';

// resolvePort and the health server now live in telegram-broadcast-kit and are
// tested there. channelUrlFrom is numninjas-specific (the /start DM link), so
// it stays here.
describe('channelUrlFrom', () => {
  it('builds a t.me URL from @username', () => {
    expect(channelUrlFrom('@numninjas')).toBe('https://t.me/numninjas');
  });

  it('returns null for a numeric -100 id (no derivable public link)', () => {
    expect(channelUrlFrom('-1001234567890')).toBe(null);
  });

  it('accepts a full t.me URL', () => {
    expect(channelUrlFrom('https://t.me/numninjas')).toBe('https://t.me/numninjas');
    expect(channelUrlFrom('t.me/numninjas')).toBe('https://t.me/numninjas');
  });

  it('rejects a too-short username', () => {
    expect(channelUrlFrom('@abc')).toBe(null);
  });
});
