// Pure state transitions. Each takes the owner's current state and returns a Change, or throws HttpError.
import { DAY_END, DAY_START, findOverlap } from './rules';
import { fmt } from './time';
import { HttpError, type AddVisitInput } from './validate';
import type { Change, DayState, NewEvent, Status, VisitRec } from './types';

export const MAX_VISITS = 40;

const ev = (visitId: string, now: string, action: string, detail: string): NewEvent => ({ visitId, source: 'action', at: now, action, detail });

function find(s: DayState, id: string): VisitRec {
  const v = s.visits.find((x) => x.id === id);
  if (!v) throw new HttpError(404, 'visit not found');
  return v;
}

function checkCaregiver(s: DayState, id: string) {
  const c = s.caregivers.find((x) => x.id === id);
  if (!c) throw new HttpError(400, 'caregiver does not exist');
  return c;
}

function overlapCheck(s: DayState, caregiverId: string, start: number, end: number, exclude?: string) {
  const clash = findOverlap(s.visits, caregiverId, start, end, exclude);
  if (clash) {
    throw new HttpError(409, `double-booking: caregiver already has ${clash.client} ${fmt(clash.start)}-${fmt(clash.end)} (${clash.id})`);
  }
}

export function assign(s: DayState, id: string, caregiverId: string | null, now: string): Change {
  const v = find(s, id);
  if (v.status === 'in_progress' || v.status === 'completed') throw new HttpError(409, `cannot reassign a visit that is ${v.status.replace('_', ' ')}`);
  if (caregiverId === v.caregiverId) throw new HttpError(409, 'visit already has this assignment');
  let detail = 'Caregiver unassigned';
  if (caregiverId) {
    const c = checkCaregiver(s, caregiverId);
    overlapCheck(s, caregiverId, v.start, v.end, v.id);
    const prev = v.caregiverId ? s.caregivers.find((x) => x.id === v.caregiverId)?.name : null;
    detail = prev ? `Reassigned from ${prev} to ${c.name}` : `Assigned ${c.name}`;
  }
  // A new caregiver has not set off yet, so an en-route status resets.
  const status: Status = 'scheduled';
  return { visits: [{ ...v, caregiverId, status }], events: [ev(id, now, caregiverId ? 'assigned' : 'unassigned', detail)] };
}

export function enRoute(s: DayState, id: string, now: string): Change {
  const v = find(s, id);
  if (!v.caregiverId) throw new HttpError(409, 'assign a caregiver before marking en route');
  if (v.status !== 'scheduled') throw new HttpError(409, `cannot mark en route from ${v.status.replace('_', ' ')}`);
  return { visits: [{ ...v, status: 'en_route' }], events: [ev(id, now, 'en_route', 'Caregiver marked en route')] };
}

export function start(s: DayState, id: string, now: string): Change {
  const v = find(s, id);
  if (!v.caregiverId) throw new HttpError(409, 'assign a caregiver before starting');
  if (v.status !== 'scheduled' && v.status !== 'en_route') throw new HttpError(409, `cannot start a visit that is ${v.status.replace('_', ' ')}`);
  return { visits: [{ ...v, status: 'in_progress' }], events: [ev(id, now, 'started', 'Visit started')] };
}

export function complete(s: DayState, id: string, now: string): Change {
  const v = find(s, id);
  if (v.status !== 'in_progress') throw new HttpError(409, `can only complete a visit that is in progress (currently ${v.status.replace('_', ' ')})`);
  return { visits: [{ ...v, status: 'completed' }], events: [ev(id, now, 'completed', 'Visit completed')] };
}

/** Next id: v<max numeric suffix + 1>; deterministic. */
export function nextVisitId(visits: VisitRec[]): string {
  return `v${visits.reduce((m, v) => Math.max(m, Number(v.id.slice(1)) || 0), 0) + 1}`;
}

export function addVisit(s: DayState, input: AddVisitInput, now: string): Change {
  if (s.visits.length >= MAX_VISITS) throw new HttpError(409, `visit limit reached (${MAX_VISITS})`);
  if (input.start < DAY_START || input.end > DAY_END) throw new HttpError(400, 'visit must fall within 07:00-19:00');
  if (input.caregiverId) {
    checkCaregiver(s, input.caregiverId);
    overlapCheck(s, input.caregiverId, input.start, input.end);
  }
  const id = nextVisitId(s.visits);
  const v: VisitRec = {
    id, client: input.client, area: input.area, caregiverId: input.caregiverId, start: input.start, end: input.end,
    status: 'scheduled', tasks: input.tasks.map((label) => ({ label, done: false })), notes: [],
  };
  return { visits: [v], events: [ev(id, now, 'created', `Visit added ${fmt(v.start)}-${fmt(v.end)}${v.caregiverId ? '' : ' (unassigned)'}`)] };
}
