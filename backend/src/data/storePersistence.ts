import fs from 'fs';
import path from 'path';

/**
 * Keeps the in-memory dbStore across backend restarts by saving it to a JSON file.
 * Temporary until the data moves to PostgreSQL.
 *
 * - restoreSnapshot(): after seeding, replaces the seeded arrays with the saved ones.
 * - startAutoSave(): every 2 s, writes the file if anything changed (atomic tmp + rename),
 *   and once more on Ctrl+C / normal exit.
 *
 * Set STORE_PERSIST=false to switch it off; delete the file to start from the seed data again.
 */
export const SNAPSHOT_PATH = path.resolve(
  process.env.STORE_SNAPSHOT_PATH || path.join(process.cwd(), 'data', 'store-snapshot.json')
);

const KEYS = [
  'departments',
  'users',
  'products',
  'promoLists',
  'promoLines',
  'approvals',
  'notifications',
  'auditLogs',
] as const;

type Store = Record<(typeof KEYS)[number], unknown[]>;

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export const persistenceEnabled = () => process.env.STORE_PERSIST !== 'false';

function snapshotJson(store: Store): string {
  const data: Record<string, unknown> = { savedAt: new Date().toISOString() };
  for (const key of KEYS) data[key] = store[key];
  return JSON.stringify(data);
}

/** Load the saved file into the store. Returns the number of promo lists restored, or null if there was no file. */
export function restoreSnapshot(store: Store): number | null {
  if (!fs.existsSync(SNAPSHOT_PATH)) return null;
  const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  const data = JSON.parse(raw, (_k, v) => (typeof v === 'string' && ISO_TIMESTAMP.test(v) ? new Date(v) : v));
  for (const key of KEYS) {
    if (Array.isArray(data[key])) store[key] = data[key];
  }
  return Array.isArray(data.promoLists) ? data.promoLists.length : 0;
}

export function startAutoSave(store: Store, intervalMs = 2000): void {
  let last = '';
  const save = () => {
    try {
      const json = snapshotJson(store);
      // savedAt always differs; compare the data part only
      const body = json.slice(json.indexOf(',"departments"'));
      if (body === last) return;
      fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
      const tmp = `${SNAPSHOT_PATH}.tmp`;
      fs.writeFileSync(tmp, json);
      fs.renameSync(tmp, SNAPSHOT_PATH);
      last = body;
    } catch (err) {
      console.error('[store] Could not save snapshot:', (err as Error).message);
    }
  };

  // Mark the current state as saved so an unchanged store is not rewritten on start
  const initial = snapshotJson(store);
  last = initial.slice(initial.indexOf(',"departments"'));
  setInterval(save, intervalMs).unref();
  process.on('exit', save);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      save();
      process.exit(0);
    });
  }
}
