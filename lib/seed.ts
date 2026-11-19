// All data below is SYNTHETIC. Fictional agency, clients and caregivers.
import type { Caregiver, DayState, NewEvent, Status, Task, VisitRec } from './types';
import { DEFAULT_SETTINGS } from './rules';

export const AGENCY = 'Demo Care Agency';

export const SEED_CAREGIVERS: Caregiver[] = [
  { id: 'cg1', name: 'Amara Okafor', initials: 'AO' },
  { id: 'cg2', name: 'Ben Hartley', initials: 'BH' },
  { id: 'cg3', name: 'Chen Wei', initials: 'CW' },
  { id: 'cg4', name: 'Dana Ruiz', initials: 'DR' },
  { id: 'cg5', name: 'Eli Novak', initials: 'EN' },
];

const t = (h: number, m = 0) => h * 60 + m;
const T = (items: [string, boolean][]): Task[] => items.map(([label, done]) => ({ label, done }));
type Seed = Omit<VisitRec, 'status'> & { status: Status; history: [string, string][] };

const SCHED: [string, string] = ['07:00', 'Visit scheduled'];

const SEEDS: Seed[] = [
  { id: 'v1', client: 'Mrs. Alder', area: 'Northfield', caregiverId: 'cg1', start: t(7, 30), end: t(8, 30), status: 'completed',
    tasks: T([['Morning medication prompt', true], ['Breakfast preparation', true], ['Help with dressing', true]]),
    notes: ['Mrs. Alder was in good spirits and ate a full breakfast.'],
    history: [['07:21', 'Caregiver en route'], ['07:31', 'Checked in'], ['08:29', 'Checked out - completed']] },
  { id: 'v2', client: 'Mr. Bright', area: 'Eastgate', caregiverId: 'cg2', start: t(8), end: t(9), status: 'completed',
    tasks: T([['Personal care', true], ['Light housekeeping', true], ['Check pantry list', true]]),
    notes: ['Pantry is low on tea and bread; passed on to family contact.'],
    history: [['07:48', 'Caregiver en route'], ['08:02', 'Checked in'], ['09:00', 'Checked out - completed']] },
  { id: 'v3', client: 'Ms. Calloway', area: 'Riverside', caregiverId: 'cg3', start: t(8, 30), end: t(9, 30), status: 'completed',
    tasks: T([['Mobility exercises', true], ['Prepare lunch for later', true]]),
    notes: ['Completed all exercises; mentioned mild stiffness in left knee.'],
    history: [['08:20', 'Caregiver en route'], ['08:33', 'Checked in'], ['09:31', 'Checked out - completed']] },
  { id: 'v4', client: 'Mr. Dimitri', area: 'Old Mill', caregiverId: 'cg4', start: t(9), end: t(10, 30), status: 'in_progress',
    tasks: T([['Personal care', true], ['Breakfast preparation', true], ['Medication prompt', false], ['Short walk', false]]),
    notes: ['Mr. Dimitri asked to walk later than usual today.'],
    history: [['08:50', 'Caregiver en route'], ['09:02', 'Checked in'], ['09:55', 'Task completed: breakfast']] },
  { id: 'v5', client: 'Mrs. Eastwood', area: 'Northfield', caregiverId: 'cg1', start: t(9, 45), end: t(10, 45), status: 'in_progress',
    tasks: T([['Morning medication prompt', true], ['Tidy kitchen', false], ['Companionship / conversation', false]]),
    notes: ['Sample note: client enjoys the crossword; please bring the newspaper.'],
    history: [['09:38', 'Caregiver en route'], ['09:46', 'Checked in']] },
  { id: 'v6', client: 'Mr. Farrow', area: 'Eastgate', caregiverId: 'cg2', start: t(10, 30), end: t(11, 30), status: 'scheduled',
    tasks: T([['Personal care', false], ['Lunch preparation', false], ['Laundry', false]]),
    notes: ['Sample note: door code changed last week - check the visit sheet.'], history: [SCHED] },
  { id: 'v7', client: 'Ms. Garza', area: 'Riverside', caregiverId: 'cg3', start: t(10, 40), end: t(11, 40), status: 'en_route',
    tasks: T([['Mobility exercises', false], ['Shopping list review', false]]),
    notes: ['Sample note: prefers calls before arrival.'], history: [SCHED, ['10:08', 'Caregiver en route']] },
  { id: 'v8', client: 'Mr. Hollis', area: 'Hillcrest', caregiverId: null, start: t(11), end: t(12), status: 'scheduled',
    tasks: T([['Medication prompt', false], ['Lunch preparation', false], ['Check mail', false]]),
    notes: ['Sample note: regular caregiver is on leave this week.'], history: [SCHED, ['08:40', 'Caregiver unassigned (leave)']] },
  { id: 'v9', client: 'Mrs. Ilves', area: 'Old Mill', caregiverId: 'cg4', start: t(12, 30), end: t(13, 30), status: 'scheduled',
    tasks: T([['Lunch preparation', false], ['Medication prompt', false], ['Afternoon walk', false]]), notes: [], history: [SCHED] },
  { id: 'v10', client: 'Ms. Jansen', area: 'Hillcrest', caregiverId: 'cg5', start: t(13), end: t(14), status: 'scheduled',
    tasks: T([['Personal care', false], ['Light housekeeping', false]]),
    notes: ['Sample note: has a hospital appointment on Thursday.'], history: [SCHED] },
  { id: 'v11', client: 'Mr. Kwan', area: 'Eastgate', caregiverId: 'cg5', start: t(16), end: t(17), status: 'scheduled',
    tasks: T([['Evening meal preparation', false], ['Medication prompt', false], ['Settle for evening', false]]), notes: [], history: [SCHED] },
  { id: 'v12', client: 'Ms. Nakamura', area: 'Riverside', caregiverId: 'cg5', start: t(9, 30), end: t(10, 30), status: 'scheduled',
    tasks: T([['Personal care', false], ['Breakfast preparation', false]]),
    notes: ['Sample note: no check-in recorded yet.'], history: [SCHED, ['09:30', 'No check-in at scheduled start']] },
];

/** The seeded demo day. Seeded history entries carry source 'seeded'. */
export function seedState(): Omit<DayState, 'events'> & { events: NewEvent[] } {
  const events: NewEvent[] = [];
  const visits: VisitRec[] = SEEDS.map(({ history, ...v }) => {
    for (const [at, action] of history) events.push({ visitId: v.id, source: 'seeded', at, action, detail: '' });
    return v;
  });
  return { caregivers: SEED_CAREGIVERS, visits, settings: { ...DEFAULT_SETTINGS }, events };
}
