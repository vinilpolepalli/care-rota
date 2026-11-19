// Deterministic rules engine. Pure functions only: no I/O, no clock reads, no randomness.
import type { Caregiver, Settings, Status, VisitRec } from './types';

export const NOW_MIN = 10 * 60 + 15; // fixed demo clock: 10:15 (stated constant, not the wall clock)
export const DAY_START = 7 * 60;
export const DAY_END = 19 * 60;
export const DEFAULT_SETTINGS: Settings = { lateWindowMin: 30, gapThresholdMin: 90 };
export const SETTING_LIMITS = { lateWindowMin: [5, 120], gapThresholdMin: [15, 240] } as const;

export type FlagKind = 'LATE RISK' | 'GAP' | 'UNCOVERED';
export type DisplayStatus = 'completed' | 'in progress' | 'en route' | 'upcoming' | 'at risk';

export interface Flag {
  kind: FlagKind;
  state: string; // plain-language state of the rule for this visit
  threshold: number | null; // minutes, or null for a rule without a numeric threshold
  compared: { label: string; value: number }[];
}

export interface GapSpan { caregiverId: string; from: number; to: number; minutes: number; beforeVisitId: string; flagged: boolean }

export interface EvaluatedVisit extends VisitRec {
  display: DisplayStatus;
  flags: Flag[];
  gapBefore: number | null;
}

export interface Stats { coveredPct: number; avgGapMin: number; completed: number; total: number; gapCount: number }

const byTime = (a: VisitRec, b: VisitRec) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id, 'en', { numeric: true });

/** Visits grouped per caregiver id (every caregiver present), each list sorted by time. */
export function groupByCaregiver(visits: VisitRec[], caregivers: Caregiver[]): Map<string, VisitRec[]> {
  const map = new Map<string, VisitRec[]>(caregivers.map((c) => [c.id, []]));
  for (const v of visits) if (v.caregiverId && map.has(v.caregiverId)) map.get(v.caregiverId)!.push(v);
  for (const l of map.values()) l.sort(byTime);
  return map;
}

/** Idle spans between consecutive visits of the same caregiver. */
export function gapSpans(visits: VisitRec[], caregivers: Caregiver[], s: Settings): GapSpan[] {
  const out: GapSpan[] = [];
  for (const [caregiverId, list] of groupByCaregiver(visits, caregivers)) {
    for (let i = 1; i < list.length; i++) {
      const minutes = list[i].start - list[i - 1].end;
      out.push({ caregiverId, from: list[i - 1].end, to: list[i].start, minutes, beforeVisitId: list[i].id, flagged: minutes > s.gapThresholdMin });
    }
  }
  return out;
}

/** LATE RISK: not started, caregiver assigned but not en route, starts within the window of now (or already past). */
export function lateRisk(v: VisitRec, now: number, s: Settings): Flag | null {
  if (v.status !== 'scheduled' || !v.caregiverId) return null;
  const until = v.start - now;
  if (until > s.lateWindowMin) return null;
  return {
    kind: 'LATE RISK',
    state: until < 0 ? `start time passed ${-until} min ago; caregiver not en route` : `starts in ${until} min; caregiver not en route`,
    threshold: s.lateWindowMin,
    compared: [{ label: 'minutes until start', value: until }, { label: 'window (min)', value: s.lateWindowMin }],
  };
}

/** UNCOVERED: no caregiver on a visit that has not been completed. */
export function uncovered(v: VisitRec, now: number): Flag | null {
  if (v.caregiverId || v.status === 'completed') return null;
  return {
    kind: 'UNCOVERED',
    state: 'no caregiver assigned',
    threshold: null,
    compared: [{ label: 'caregivers assigned', value: 0 }, { label: 'minutes until start', value: v.start - now }],
  };
}

/** GAP: idle time before this visit (after the same caregiver's previous visit) exceeds the threshold. */
export function gapFlag(v: VisitRec, gap: number | null, s: Settings): Flag | null {
  if (gap === null || gap <= s.gapThresholdMin || v.status === 'completed') return null;
  return {
    kind: 'GAP',
    state: `${gap} min idle before this visit`,
    threshold: s.gapThresholdMin,
    compared: [{ label: 'gap (min)', value: gap }, { label: 'threshold (min)', value: s.gapThresholdMin }],
  };
}

export function displayStatus(status: Status, flags: Flag[]): DisplayStatus {
  if (status === 'completed') return 'completed';
  if (status === 'in_progress') return 'in progress';
  if (status === 'en_route') return 'en route';
  return flags.some((f) => f.kind === 'LATE RISK') ? 'at risk' : 'upcoming';
}

export function computeStats(visits: VisitRec[], spans: GapSpan[]): Stats {
  const total = visits.length;
  return {
    coveredPct: total ? Math.round((visits.filter((v) => v.caregiverId).length / total) * 100) : 0,
    avgGapMin: spans.length ? Math.round(spans.reduce((a, g) => a + g.minutes, 0) / spans.length) : 0,
    completed: visits.filter((v) => v.status === 'completed').length,
    total,
    gapCount: spans.length,
  };
}

/** Full derivation from live state: per-visit flags + status, gap spans and stats. Visits come back sorted by time. */
export function evaluate(visits: VisitRec[], caregivers: Caregiver[], s: Settings, now = NOW_MIN) {
  const spans = gapSpans(visits, caregivers, s);
  const gapOf = new Map(spans.map((g) => [g.beforeVisitId, g.minutes]));
  const evaluated: EvaluatedVisit[] = [...visits].sort(byTime).map((v) => {
    const gapBefore = gapOf.get(v.id) ?? null;
    const flags = [lateRisk(v, now, s), gapFlag(v, gapBefore, s), uncovered(v, now)].filter((f): f is Flag => f !== null);
    return { ...v, flags, gapBefore, display: displayStatus(v.status, flags) };
  });
  return { visits: evaluated, gaps: spans, stats: computeStats(visits, spans) };
}

/** First visit of this caregiver overlapping [start, end), ignoring `excludeId`. Touching ends do not overlap. */
export function findOverlap(visits: VisitRec[], caregiverId: string, start: number, end: number, excludeId?: string): VisitRec | null {
  return visits.find((v) => v.caregiverId === caregiverId && v.id !== excludeId && v.start < end && start < v.end) ?? null;
}
