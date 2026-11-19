import { Pool, type PoolClient } from 'pg';
import { seedState } from '../seed';
import type { Change, DayState, EventRec, Status, VisitRec } from '../types';
import type { Store } from './store';

// Postgres implementation for production (DATABASE_URL). Same tables and semantics as the SQLite store.
// NOT exercised against a live Postgres in this repo's verification (see IMPLEMENTATION.md).
export async function createPgStore(url: string): Promise<Store> {
  const pool = new Pool({ connectionString: url });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS caregivers (owner_id TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, initials TEXT NOT NULL, PRIMARY KEY(owner_id, id));
    CREATE TABLE IF NOT EXISTS visits (owner_id TEXT NOT NULL, id TEXT NOT NULL, client TEXT NOT NULL, area TEXT NOT NULL, caregiver_id TEXT, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL, status TEXT NOT NULL, tasks TEXT NOT NULL, notes TEXT NOT NULL, PRIMARY KEY(owner_id, id));
    CREATE TABLE IF NOT EXISTS settings (owner_id TEXT PRIMARY KEY, late_window_min INTEGER NOT NULL, gap_threshold_min INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS visit_events (seq BIGSERIAL PRIMARY KEY, owner_id TEXT NOT NULL, visit_id TEXT NOT NULL, source TEXT NOT NULL, at TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS events_owner ON visit_events(owner_id);
    CREATE TABLE IF NOT EXISTS write_counts (owner_id TEXT NOT NULL, bucket BIGINT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(owner_id, bucket));
  `);

  async function tx<T>(owner: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [owner]); // serialise per owner
      const out = await fn(c);
      await c.query('COMMIT');
      return out;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally { c.release(); }
  }

  const upsertVisit = (c: PoolClient, owner: string, v: VisitRec) => c.query(
    `INSERT INTO visits (owner_id, id, client, area, caregiver_id, start_min, end_min, status, tasks, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (owner_id, id) DO UPDATE SET client=$3, area=$4, caregiver_id=$5, start_min=$6, end_min=$7, status=$8, tasks=$9, notes=$10`,
    [owner, v.id, v.client, v.area, v.caregiverId, v.start, v.end, v.status, JSON.stringify(v.tasks), JSON.stringify(v.notes)]);
  const insertEvent = (c: PoolClient, owner: string, e: { visitId: string; source: string; at: string; action: string; detail: string }) => c.query(
    'INSERT INTO visit_events (owner_id, visit_id, source, at, action, detail) VALUES ($1,$2,$3,$4,$5,$6)', [owner, e.visitId, e.source, e.at, e.action, e.detail]);

  async function seed(c: PoolClient, owner: string) {
    const d = seedState();
    await c.query('INSERT INTO settings VALUES ($1,$2,$3)', [owner, d.settings.lateWindowMin, d.settings.gapThresholdMin]);
    for (const g of d.caregivers) await c.query('INSERT INTO caregivers VALUES ($1,$2,$3,$4)', [owner, g.id, g.name, g.initials]);
    for (const v of d.visits) await upsertVisit(c, owner, v);
    for (const e of d.events) await insertEvent(c, owner, e);
  }
  async function ensure(c: PoolClient, owner: string) {
    if (!(await c.query('SELECT 1 FROM settings WHERE owner_id=$1', [owner])).rows[0]) await seed(c, owner);
  }
  async function read(c: PoolClient, owner: string): Promise<DayState> {
    const s = (await c.query('SELECT * FROM settings WHERE owner_id=$1', [owner])).rows[0];
    const g = await c.query('SELECT * FROM caregivers WHERE owner_id=$1 ORDER BY id', [owner]);
    const v = await c.query('SELECT * FROM visits WHERE owner_id=$1', [owner]);
    const e = await c.query('SELECT * FROM visit_events WHERE owner_id=$1 ORDER BY seq', [owner]);
    return {
      settings: { lateWindowMin: s.late_window_min, gapThresholdMin: s.gap_threshold_min },
      caregivers: g.rows.map((r) => ({ id: r.id, name: r.name, initials: r.initials })),
      visits: v.rows.map((r): VisitRec => ({
        id: r.id, client: r.client, area: r.area, caregiverId: r.caregiver_id, start: r.start_min, end: r.end_min,
        status: r.status as Status, tasks: JSON.parse(r.tasks), notes: JSON.parse(r.notes),
      })),
      events: e.rows.map((r): EventRec => ({ seq: Number(r.seq), visitId: r.visit_id, source: r.source, at: r.at, action: r.action, detail: r.detail })),
    };
  }

  return {
    load: (owner) => tx(owner, async (c) => { await ensure(c, owner); return read(c, owner); }),
    mutate: (owner, fn) => tx(owner, async (c) => {
      await ensure(c, owner);
      const change: Change = fn(await read(c, owner));
      for (const v of change.visits) await upsertVisit(c, owner, v);
      for (const e of change.events) await insertEvent(c, owner, e);
      if (change.settings) await c.query('UPDATE settings SET late_window_min=$2, gap_threshold_min=$3 WHERE owner_id=$1', [owner, change.settings.lateWindowMin, change.settings.gapThresholdMin]);
      return read(c, owner);
    }),
    reset: (owner) => tx(owner, async (c) => {
      for (const t of ['caregivers', 'visits', 'settings', 'visit_events']) await c.query(`DELETE FROM ${t} WHERE owner_id=$1`, [owner]);
      await seed(c, owner);
      return read(c, owner);
    }),
    async allowWrite(owner, limit, now = Date.now()) {
      const bucket = Math.floor(now / 3_600_000);
      // Atomic conditional increment: only succeeds while under the limit.
      const r = await pool.query(
        `INSERT INTO write_counts (owner_id, bucket, count) VALUES ($1,$2,1)
         ON CONFLICT (owner_id, bucket) DO UPDATE SET count = write_counts.count + 1 WHERE write_counts.count < $3 RETURNING count`,
        [owner, bucket, limit]);
      if (r.rowCount === 0) return false;
      await pool.query('DELETE FROM write_counts WHERE bucket < $1', [bucket]);
      return true;
    },
  };
}
