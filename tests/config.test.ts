import { describe, expect, it } from 'vitest';
import { channelUrlFrom, resolvePort } from '../src/config';

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

describe('resolvePort', () => {
  it('defaults to 8080 when undefined', () => {
    expect(resolvePort(undefined)).toBe(8080);
  });
  it('parses a valid port string', () => {
    expect(resolvePort('3000')).toBe(3000);
  });
  it('falls back to 8080 on garbage', () => {
    expect(resolvePort('not-a-number')).toBe(8080);
    expect(resolvePort('-1')).toBe(8080);
    expect(resolvePort('99999')).toBe(8080);
  });
});
