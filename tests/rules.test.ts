import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS as S, NOW_MIN, evaluate, findOverlap, gapSpans, lateRisk, uncovered } from '../lib/rules';
import { seedState } from '../lib/seed';
import type { VisitRec } from '../lib/types';

const cg = [{ id: 'a', name: 'A', initials: 'A' }, { id: 'b', name: 'B', initials: 'B' }];
const v = (id: string, caregiverId: string | null, start: number, end: number, status: VisitRec['status'] = 'scheduled'): VisitRec =>
  ({ id, client: id, area: '', caregiverId, start, end, status, tasks: [], notes: [] });
const h = (hh: number, mm = 0) => hh * 60 + mm;

describe('late risk', () => {
  it('fires at exactly the window boundary and not one minute later', () => {
    expect(lateRisk(v('x', 'a', NOW_MIN + 30, NOW_MIN + 90), NOW_MIN, S)).not.toBeNull();
    expect(lateRisk(v('x', 'a', NOW_MIN + 31, NOW_MIN + 90), NOW_MIN, S)).toBeNull();
  });
  it('fires when already past start', () => {
    const f = lateRisk(v('x', 'a', NOW_MIN - 45, NOW_MIN + 15), NOW_MIN, S)!;
    expect(f.compared[0].value).toBe(-45);
  });
  it('does not fire when en route, started, or unassigned', () => {
    for (const status of ['en_route', 'in_progress', 'completed'] as const) expect(lateRisk(v('x', 'a', NOW_MIN, NOW_MIN + 60, status), NOW_MIN, S)).toBeNull();
    expect(lateRisk(v('x', null, NOW_MIN, NOW_MIN + 60), NOW_MIN, S)).toBeNull();
  });
  it('respects an edited window', () => {
    const x = v('x', 'a', NOW_MIN + 50, NOW_MIN + 110);
    expect(lateRisk(x, NOW_MIN, S)).toBeNull();
    expect(lateRisk(x, NOW_MIN, { ...S, lateWindowMin: 60 })).not.toBeNull();
  });
});

describe('gap', () => {
  const day = [v('1', 'a', h(8), h(9)), v('2', 'a', h(10, 30), h(11)), v('3', 'a', h(12, 31), h(13))];
  it('is strictly greater than the threshold and flags the following visit', () => {
    const r = evaluate(day, cg, S);
    expect(r.visits.find((x) => x.id === '2')!.flags.map((f) => f.kind)).not.toContain('GAP'); // 90 exactly
    const f = r.visits.find((x) => x.id === '3')!.flags.find((x) => x.kind === 'GAP')!;
    expect(f.kind).toBe('GAP');
    expect(f.compared[0].value).toBe(91);
    expect(r.visits.find((x) => x.id === '1')!.gapBefore).toBeNull();
  });
  it('never pairs visits across caregivers', () => {
    const spans = gapSpans([v('1', 'a', h(8), h(9)), v('2', 'b', h(15), h(16))], cg, S);
    expect(spans).toEqual([]);
  });
  it('uses the edited threshold', () => {
    expect(evaluate(day, cg, { ...S, gapThresholdMin: 30 }).visits.find((x) => x.id === '2')!.flags.map((f) => f.kind)).toContain('GAP');
  });
});

describe('uncovered, status, stats', () => {
  it('flags unassigned visits unless completed', () => {
    expect(uncovered(v('x', null, h(11), h(12)), NOW_MIN)).not.toBeNull();
    expect(uncovered(v('x', null, h(8), h(9), 'completed'), NOW_MIN)).toBeNull();
  });
  it('derives display status', () => {
    const r = evaluate([v('1', 'a', h(10, 30), h(11)), v('2', 'a', h(12), h(13), 'en_route'), v('3', 'b', h(8), h(9), 'completed'), v('4', 'b', h(9), h(10), 'in_progress'), v('5', 'b', h(14), h(15))], cg, S);
    expect(Object.fromEntries(r.visits.map((x) => [x.id, x.display]))).toEqual({ 1: 'at risk', 2: 'en route', 3: 'completed', 4: 'in progress', 5: 'upcoming' });
  });
  it('computes stats; empty day is zero not NaN', () => {
    const r = evaluate([v('1', 'a', h(8), h(9), 'completed'), v('2', 'a', h(10), h(11)), v('3', null, h(12), h(13)), v('4', 'b', h(8), h(9))], cg, S);
    expect(r.stats).toMatchObject({ coveredPct: 75, completed: 1, total: 4, avgGapMin: 60, gapCount: 1 });
    expect(evaluate([], cg, S).stats).toMatchObject({ coveredPct: 0, avgGapMin: 0, total: 0 });
  });
});

describe('overlap', () => {
  const vs = [v('1', 'a', h(9), h(10))];
  it('detects overlap, allows touching ends, ignores other caregivers and self', () => {
    expect(findOverlap(vs, 'a', h(9, 30), h(10, 30))).not.toBeNull();
    expect(findOverlap(vs, 'a', h(10), h(11))).toBeNull();
    expect(findOverlap(vs, 'a', h(8), h(9))).toBeNull();
    expect(findOverlap(vs, 'b', h(9), h(10))).toBeNull();
    expect(findOverlap(vs, 'a', h(9), h(10), '1')).toBeNull();
  });
});

describe('seeded day (hand-computed at 10:15, thresholds 30/90)', () => {
  const d = seedState();
  const r = evaluate(d.visits, d.caregivers, d.settings);
  const flags = Object.fromEntries(r.visits.map((x) => [x.id, x.flags.map((f) => f.kind)]));
  it('matches expected flags', () => {
    expect(flags).toEqual({
      v1: [], v2: [], v3: [], v4: [], v5: [],
      v6: ['LATE RISK'], v7: [], v8: ['UNCOVERED'], v9: ['GAP'], v10: ['GAP'], v11: ['GAP'], v12: ['LATE RISK'],
    });
  });
  it('matches expected stats', () => {
    // gaps: cg1 75, cg2 90, cg3 70, cg4 120, cg5 150+120 -> 625/6 = 104.2
    expect(r.stats).toEqual({ coveredPct: 92, avgGapMin: 104, completed: 3, total: 12, gapCount: 6 });
  });
});
