import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import {
  _resetForTests,
  clearMessageId,
  getMessageId,
  initState,
  setMessageId,
} from '../src/lib/state';

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'numninjas-state-'));
  file = path.join(dir, 'last-message-ids.json');
  _resetForTests();
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  _resetForTests();
});

describe('state pointer file', () => {
  it('starts empty when the file does not exist', async () => {
    await initState(file);
    expect(getMessageId('daily_checkin_poll')).toBeUndefined();
  });

  it('round-trips a tracked id across an init reload (simulated restart)', async () => {
    await initState(file);
    await setMessageId('daily_checkin_poll', 4242);
    // Simulate a process restart: re-init from the same file.
    _resetForTests();
    await initState(file);
    expect(getMessageId('daily_checkin_poll')).toBe(4242);
  });

  it('clears a tracked id and persists the removal', async () => {
    await initState(file);
    await setMessageId('daily_checkin_poll', 99);
    await clearMessageId('daily_checkin_poll');
    _resetForTests();
    await initState(file);
    expect(getMessageId('daily_checkin_poll')).toBeUndefined();
  });

  it('drops malformed values defensively', async () => {
    await fs.writeFile(
      file,
      JSON.stringify({ good: 12, bad: 'nope', zero: 0, neg: -5, float: 1.5 }),
      'utf8',
    );
    await initState(file);
    expect(getMessageId('good')).toBe(12);
    expect(getMessageId('bad')).toBeUndefined();
    expect(getMessageId('zero')).toBeUndefined();
    expect(getMessageId('neg')).toBeUndefined();
    expect(getMessageId('float')).toBeUndefined();
  });

  it('survives a corrupt JSON file by starting empty', async () => {
    await fs.writeFile(file, '{ this is not json', 'utf8');
    await initState(file);
    expect(getMessageId('anything')).toBeUndefined();
  });

  it('is a no-op (in-memory only) when initState was never called', async () => {
    // No initState call. setMessageId should not throw and should keep
    // the value in memory without touching the disk.
    await setMessageId('daily_checkin_poll', 7);
    expect(getMessageId('daily_checkin_poll')).toBe(7);
  });
});
