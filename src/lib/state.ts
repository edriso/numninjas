import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger';

/**
 * Tiny pointer file: `{ scheduleName: messageId }`.
 *
 * Why this exists
 * ───────────────
 * The daily check-in poll uses a "replace on next fire" pattern: each
 * new poll deletes the previous one so the channel keeps exactly one
 * live check-in poll, never a year of duplicates. To survive a process
 * restart we must remember the previous message id; an in-memory map
 * alone would leak orphans on every redeploy.
 *
 * This is the one deliberate carve-out from the project's "no database"
 * principle. It is NOT a database: no schema, no migrations, no queries.
 * Same conceptual weight as `.env`. Losing the file just means the next
 * fire skips one cleanup; the channel keeps working.
 *
 * Failure model (matches the rest of the project: log + continue)
 * ───────────────────────────────────────────────────────────────
 *   - File missing on boot     → start empty, log info.
 *   - File unparseable         → start empty, log warn.
 *   - Persist write fails      → log error, keep in-memory copy.
 *   - `initState` never called → in-memory only, no disk read/write.
 *     That last point lets tests use the module with no filesystem.
 */

let state: Record<string, number> = {};
let filePath: string | null = null;

/**
 * Initialise the store from disk. Call once at process start, before
 * the scheduler. Never throws. Safe to call again (resets state).
 */
export async function initState(p: string): Promise<void> {
  filePath = p;
  state = {};
  try {
    const raw = await fs.readFile(p, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (isValidId(v)) state[k] = v;
      }
    }
    logger.info('Loaded state', { path: p, tracked: Object.keys(state).length });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      logger.info('No state file yet, starting empty', { path: p });
    } else {
      logger.warn('Could not read state file, starting empty', {
        path: p,
        error: String(err),
      });
    }
  }
}

function isValidId(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

/** Read the tracked message id for a schedule, or undefined. */
export function getMessageId(name: string): number | undefined {
  return state[name];
}

/** Set the tracked id and persist (best-effort). */
export async function setMessageId(name: string, id: number): Promise<void> {
  state[name] = id;
  await persist();
}

/** Forget the tracked id (e.g. after delete) and persist. */
export async function clearMessageId(name: string): Promise<void> {
  delete state[name];
  await persist();
}

/**
 * Atomic write: serialise to a `.tmp` sibling then rename. Rename is
 * atomic on the same filesystem, so a crash mid-write never leaves a
 * half-written JSON the next boot would refuse to parse. Best effort:
 * a write failure is logged but does not throw.
 */
async function persist(): Promise<void> {
  if (!filePath) return; // initState was never called (e.g. tests).
  const target = filePath;
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    const tmp = `${target}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
    await fs.rename(tmp, target);
  } catch (err) {
    logger.error('Failed to persist state file', {
      path: target,
      error: String(err),
    });
  }
}

/** Tests only. Resets module-level state. */
export function _resetForTests(): void {
  state = {};
  filePath = null;
}
