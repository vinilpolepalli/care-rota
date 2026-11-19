import { describe, expect, it } from 'vitest';
import { addVisit, assign, complete, enRoute, start } from '../lib/ops';
import { seedState } from '../lib/seed';
import { createSqliteStore } from '../lib/db/sqlite';
import { HttpError, parseAddVisit, parseAssign, parseSettings } from '../lib/validate';
import type { DayState } from '../lib/types';

const state = (): DayState => ({ ...seedState(), events: [] }) as DayState;
const T = '2026-01-01T00:00:00.000Z';
const status = (e: unknown) => (e as HttpError).status;
const throws = (fn: () => unknown, code: number) => { try { fn(); } catch (e) { expect(status(e)).toBe(code); return; } throw new Error('did not throw'); };
const applied = (s: DayState, c: { visits: DayState['visits'] }): DayState => ({ ...s, visits: s.visits.map((v) => c.visits.find((x) => x.id === v.id) ?? v) });

describe('ops', () => {
  it('assigns uncovered visit and logs a real event', () => {
    const c = assign(state(), 'v8', 'cg1', T);
    expect(c.visits[0].caregiverId).toBe('cg1');
    expect(c.events[0]).toMatchObject({ source: 'action', action: 'assigned', visitId: 'v8', at: T });
  });
  it('409 on overlapping double-booking (assign and add), allows touching', () => {
    throws(() => assign(state(), 'v8', 'cg2', T), 409); // cg2 has v6 10:30-11:30, v8 is 11:00-12:00
    throws(() => addVisit(state(), parseAddVisit({ client: 'X', start: '10:00', end: '11:00', caregiverId: 'cg2' }), T), 409);
    expect(() => addVisit(state(), parseAddVisit({ client: 'X', start: '11:30', end: '12:30', caregiverId: 'cg2' }), T)).not.toThrow();
  });
  it('unknown caregiver 400, unknown visit 404', () => {
    throws(() => assign(state(), 'v8', 'nope', T), 400);
    throws(() => assign(state(), 'zzz', 'cg1', T), 404);
  });
  it('lifecycle: en route -> start -> complete, with illegal transitions rejected', () => {
    let s = state();
    throws(() => enRoute(s, 'v8', T), 409); // no caregiver
    throws(() => complete(s, 'v6', T), 409); // not started
    s = applied(s, enRoute(s, 'v6', T));
    expect(s.visits.find((v) => v.id === 'v6')!.status).toBe('en_route');
    throws(() => enRoute(s, 'v6', T), 409);
    s = applied(s, start(s, 'v6', T));
    throws(() => assign(s, 'v6', 'cg1', T), 409); // in progress
    s = applied(s, complete(s, 'v6', T));
    expect(s.visits.find((v) => v.id === 'v6')!.status).toBe('completed');
    throws(() => start(s, 'v6', T), 409);
  });
  it('reassigning an en-route visit resets it to scheduled', () => {
    const c = assign(state(), 'v7', 'cg5', T); // cg5 is free 10:40-11:40
    expect(c.visits[0]).toMatchObject({ caregiverId: 'cg5', status: 'scheduled' });
    expect(c.events[0].detail).toBe('Reassigned from Chen Wei to Eli Novak');
  });
  it('adds deterministic ids and enforces the visit cap', () => {
    const c = addVisit(state(), parseAddVisit({ client: 'New', start: '14:00', end: '15:00', tasks: ['a'] }), T);
    expect(c.visits[0]).toMatchObject({ id: 'v13', caregiverId: null, status: 'scheduled' });
    const full = { ...state(), visits: Array.from({ length: 40 }, (_, i) => ({ ...state().visits[0], id: `v${i + 1}` })) };
    throws(() => addVisit(full, parseAddVisit({ client: 'New', start: '14:00', end: '15:00' }), T), 409);
  });
});

describe('validation', () => {
  it('rejects bad times and shapes', () => {
    for (const b of [
      { client: 'X', start: '06:00', end: '07:30' }, { client: 'X', start: '18:00', end: '19:30' }, { client: 'X', start: '10:00', end: '10:00' },
      { client: 'X', start: '10:00', end: '09:00' }, { client: 'X', start: '9:00', end: '10:00' }, { client: '', start: '09:00', end: '10:00' },
      { client: 'X', start: '09:00', end: '10:00', extra: 1 }, { client: 'X', start: '07:00', end: '12:00' },
    ]) throws(() => parseAddVisit(b), 400);
    throws(() => parseAddVisit(null), 400);
  });
  it('settings bounds', () => {
    expect(parseSettings({ lateWindowMin: 45, gapThresholdMin: 60 })).toEqual({ lateWindowMin: 45, gapThresholdMin: 60 });
    for (const b of [{ lateWindowMin: 1, gapThresholdMin: 60 }, { lateWindowMin: 30, gapThresholdMin: 999 }, { lateWindowMin: 30.5, gapThresholdMin: 60 }, { lateWindowMin: 30 }, { lateWindowMin: '30', gapThresholdMin: 60 }]) throws(() => parseSettings(b), 400);
  });
  it('assign body', () => {
    expect(parseAssign({ caregiverId: null })).toEqual({ caregiverId: null });
    throws(() => parseAssign({}), 400);
  });
});

describe('sqlite store', () => {
  it('isolates owners, persists mutations and appends history', async () => {
    const st = createSqliteStore(':memory:');
    const a = await st.load('owner-a');
    expect(a.visits).toHaveLength(12);
    expect(a.events.every((e) => e.source === 'seeded')).toBe(true);
    await st.mutate('owner-a', (s) => assign(s, 'v8', 'cg1', T));
    const a2 = await st.load('owner-a');
    const b = await st.load('owner-b');
    expect(a2.visits.find((v) => v.id === 'v8')!.caregiverId).toBe('cg1');
    expect(b.visits.find((v) => v.id === 'v8')!.caregiverId).toBeNull();
    expect(a2.events.filter((e) => e.source === 'action')).toHaveLength(1);
    expect(b.events.filter((e) => e.source === 'action')).toHaveLength(0);
  });
  it('rolls back when the op throws', async () => {
    const st = createSqliteStore(':memory:');
    await expect(st.mutate('o', (s) => assign(s, 'v8', 'cg2', T))).rejects.toThrow();
    expect((await st.load('o')).visits.find((v) => v.id === 'v8')!.caregiverId).toBeNull();
  });
  it('settings persist; reset restores seed and clears history', async () => {
    const st = createSqliteStore(':memory:');
    await st.mutate('o', () => ({ visits: [], events: [], settings: { lateWindowMin: 60, gapThresholdMin: 45 } }));
    await st.mutate('o', (s) => start(s, 'v6', T));
    expect((await st.load('o')).settings.lateWindowMin).toBe(60);
    const r = await st.reset('o');
    expect(r.settings).toEqual({ lateWindowMin: 30, gapThresholdMin: 90 });
    expect(r.visits.find((v) => v.id === 'v6')!.status).toBe('scheduled');
    expect(r.events.some((e) => e.source === 'action')).toBe(false);
  });
  it('rate limit: 120 writes per hour then refuses; next hour resets', async () => {
    const st = createSqliteStore(':memory:');
    const t0 = 1_800_000_000_000;
    for (let i = 0; i < 120; i++) expect(await st.allowWrite('o', 120, t0)).toBe(true);
    expect(await st.allowWrite('o', 120, t0)).toBe(false);
    expect(await st.allowWrite('p', 120, t0)).toBe(true);
    expect(await st.allowWrite('o', 120, t0 + 3_600_000)).toBe(true);
  });
});
