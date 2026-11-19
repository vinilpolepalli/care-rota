import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { and, asc, eq, sql } from 'drizzle-orm';
import { seedState } from '../seed';
import type { Change, DayState, EventRec, Status, VisitRec } from '../types';
import { caregivers, settings, visitEvents, visits, writeCounts } from './schema';
import type { Store } from './store';

const toVisit = (r: typeof visits.$inferSelect): VisitRec => ({
  id: r.id, client: r.client, area: r.area, caregiverId: r.caregiverId, start: r.start, end: r.end,
  status: r.status as Status, tasks: JSON.parse(r.tasks), notes: JSON.parse(r.notes),
});
const fromVisit = (owner: string, v: VisitRec) => ({
  ownerId: owner, id: v.id, client: v.client, area: v.area, caregiverId: v.caregiverId, start: v.start, end: v.end,
  status: v.status, tasks: JSON.stringify(v.tasks), notes: JSON.stringify(v.notes),
});

export function createSqliteStore(file: string): Store {
  const raw = new Database(file);
  raw.pragma('journal_mode = WAL');
  raw.exec(`
    CREATE TABLE IF NOT EXISTS caregivers (owner_id TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, initials TEXT NOT NULL, PRIMARY KEY(owner_id, id));
    CREATE TABLE IF NOT EXISTS visits (owner_id TEXT NOT NULL, id TEXT NOT NULL, client TEXT NOT NULL, area TEXT NOT NULL, caregiver_id TEXT, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL, status TEXT NOT NULL, tasks TEXT NOT NULL, notes TEXT NOT NULL, PRIMARY KEY(owner_id, id));
    CREATE TABLE IF NOT EXISTS settings (owner_id TEXT PRIMARY KEY, late_window_min INTEGER NOT NULL, gap_threshold_min INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS visit_events (seq INTEGER PRIMARY KEY AUTOINCREMENT, owner_id TEXT NOT NULL, visit_id TEXT NOT NULL, source TEXT NOT NULL, at TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS events_owner ON visit_events(owner_id);
    CREATE TABLE IF NOT EXISTS write_counts (owner_id TEXT NOT NULL, bucket INTEGER NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(owner_id, bucket));
  `);
  const db = drizzle(raw);

  const read = (owner: string): DayState => {
    const s = db.select().from(settings).where(eq(settings.ownerId, owner)).get();
    if (!s) throw new Error('owner not seeded');
    return {
      settings: { lateWindowMin: s.lateWindowMin, gapThresholdMin: s.gapThresholdMin },
      caregivers: db.select().from(caregivers).where(eq(caregivers.ownerId, owner)).orderBy(asc(caregivers.id)).all()
        .map(({ id, name, initials }) => ({ id, name, initials })),
      visits: db.select().from(visits).where(eq(visits.ownerId, owner)).all().map(toVisit),
      events: db.select().from(visitEvents).where(eq(visitEvents.ownerId, owner)).orderBy(asc(visitEvents.seq)).all()
        .map((e): EventRec => ({ seq: e.seq, visitId: e.visitId, source: e.source as EventRec['source'], at: e.at, action: e.action, detail: e.detail })),
    };
  };

  const seed = (owner: string) => {
    const d = seedState();
    db.insert(settings).values({ ownerId: owner, ...d.settings }).run();
    db.insert(caregivers).values(d.caregivers.map((c) => ({ ownerId: owner, ...c }))).run();
    db.insert(visits).values(d.visits.map((v) => fromVisit(owner, v))).run();
    db.insert(visitEvents).values(d.events.map((e) => ({ ownerId: owner, ...e }))).run();
  };
  const ensure = (owner: string) => {
    if (!db.select().from(settings).where(eq(settings.ownerId, owner)).get()) seed(owner);
  };

  return {
    async load(owner) {
      return db.transaction(() => { ensure(owner); return read(owner); }, { behavior: 'immediate' });
    },
    async mutate(owner, fn) {
      // 'immediate' takes the write lock up front, so check-then-write cannot interleave across processes.
      return db.transaction(() => {
        ensure(owner);
        const change: Change = fn(read(owner));
        for (const v of change.visits) {
          db.insert(visits).values(fromVisit(owner, v))
            .onConflictDoUpdate({ target: [visits.ownerId, visits.id], set: fromVisit(owner, v) }).run();
        }
        if (change.events.length) db.insert(visitEvents).values(change.events.map((e) => ({ ownerId: owner, ...e }))).run();
        if (change.settings) db.update(settings).set(change.settings).where(eq(settings.ownerId, owner)).run();
        return read(owner);
      }, { behavior: 'immediate' });
    },
    async reset(owner) {
      return db.transaction(() => {
        for (const t of [caregivers, visits, settings, visitEvents]) db.delete(t).where(eq(t.ownerId, owner)).run();
        seed(owner);
        return read(owner);
      }, { behavior: 'immediate' });
    },
    async allowWrite(owner, limit, now = Date.now()) {
      const bucket = Math.floor(now / 3_600_000);
      return db.transaction(() => {
        db.insert(writeCounts).values({ ownerId: owner, bucket, count: 0 }).onConflictDoNothing().run();
        const cur = db.select().from(writeCounts).where(and(eq(writeCounts.ownerId, owner), eq(writeCounts.bucket, bucket))).get()!;
        if (cur.count >= limit) return false;
        db.update(writeCounts).set({ count: sql`${writeCounts.count} + 1` }).where(and(eq(writeCounts.ownerId, owner), eq(writeCounts.bucket, bucket))).run();
        db.delete(writeCounts).where(sql`${writeCounts.bucket} < ${bucket}`).run();
        return true;
      }, { behavior: 'immediate' });
    },
  };
}
