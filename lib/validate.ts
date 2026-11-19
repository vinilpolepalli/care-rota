import { DAY_END, DAY_START, SETTING_LIMITS } from './rules';
import { parseHHMM } from './time';
import type { Settings } from './types';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const bad = (m: string) => new HttpError(400, m);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function onlyKeys(o: Record<string, unknown>, keys: readonly string[], name: string) {
  for (const k of Object.keys(o)) if (!keys.includes(k)) throw bad(`${name}: unknown field ${k}`);
}
function text(v: unknown, name: string, min: number, max: number): string {
  if (typeof v !== 'string') throw bad(`${name} must be a string`);
  const s = v.trim();
  if (s.length < min || s.length > max) throw bad(`${name} must be ${min}-${max} characters`);
  return s;
}

export function parseSettings(v: unknown): Settings {
  if (!isObj(v)) throw bad('settings must be an object');
  onlyKeys(v, ['lateWindowMin', 'gapThresholdMin'], 'settings');
  const out = {} as Settings;
  for (const k of ['lateWindowMin', 'gapThresholdMin'] as const) {
    const n = v[k];
    const [lo, hi] = SETTING_LIMITS[k];
    if (typeof n !== 'number' || !Number.isInteger(n)) throw bad(`${k} must be an integer`);
    if (n < lo || n > hi) throw bad(`${k} must be between ${lo} and ${hi}`);
    out[k] = n;
  }
  return out;
}

/** Assign body: { caregiverId: string | null }. Existence of the caregiver is checked against the owner's data. */
export function parseAssign(v: unknown): { caregiverId: string | null } {
  if (!isObj(v)) throw bad('body must be an object');
  onlyKeys(v, ['caregiverId'], 'assign');
  if (!('caregiverId' in v)) throw bad('assign: missing caregiverId');
  if (v.caregiverId === null) return { caregiverId: null };
  return { caregiverId: text(v.caregiverId, 'caregiverId', 1, 32) };
}

export interface AddVisitInput {
  client: string; area: string; start: number; end: number; tasks: string[]; caregiverId: string | null;
}

export function parseAddVisit(v: unknown): AddVisitInput {
  if (!isObj(v)) throw bad('body must be an object');
  onlyKeys(v, ['client', 'area', 'start', 'end', 'tasks', 'caregiverId'], 'visit');
  const start = parseHHMM(v.start);
  const end = parseHHMM(v.end);
  if (start === null) throw bad('start must be HH:MM');
  if (end === null) throw bad('end must be HH:MM');
  if (start < DAY_START || end > DAY_END) throw bad('visit must fall within 07:00-19:00');
  if (end - start < 15) throw bad('visit must be at least 15 minutes (end after start)');
  if (end - start > 240) throw bad('visit must be at most 4 hours');
  let tasks: string[] = [];
  if (v.tasks !== undefined) {
    if (!Array.isArray(v.tasks) || v.tasks.length > 8) throw bad('tasks must be an array of at most 8 strings');
    tasks = v.tasks.map((t, i) => text(t, `tasks[${i}]`, 1, 80));
  }
  let caregiverId: string | null = null;
  if (v.caregiverId !== undefined && v.caregiverId !== null) caregiverId = text(v.caregiverId, 'caregiverId', 1, 32);
  return {
    client: text(v.client, 'client', 1, 60),
    area: v.area === undefined ? '' : text(v.area, 'area', 0, 40),
    start, end, tasks, caregiverId,
  };
}
