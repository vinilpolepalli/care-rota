import { AGENCY } from './seed';
import { DAY_END, DAY_START, NOW_MIN, SETTING_LIMITS, evaluate } from './rules';
import { fmt } from './time';
import { HttpError } from './validate';
import type { DayState } from './types';

export const RULE_TEXT = (s: DayState['settings']) => [
  { kind: 'LATE RISK', text: `Visit not started, caregiver assigned but not en route, and starts within ${s.lateWindowMin} min of now (or already past its start).`, threshold: s.lateWindowMin },
  { kind: 'GAP', text: `Same caregiver has more than ${s.gapThresholdMin} min between the end of one visit and the start of the next; flagged on the following visit.`, threshold: s.gapThresholdMin },
  { kind: 'UNCOVERED', text: 'Visit has no caregiver assigned and is not completed.', threshold: null },
];

/** The board read model: everything derived server-side from live state. */
export function presentBoard(state: DayState) {
  const { visits, gaps, stats } = evaluate(state.visits, state.caregivers, state.settings);
  return {
    agency: AGENCY,
    label: 'Sample data - demo',
    now: { minutes: NOW_MIN, label: fmt(NOW_MIN), note: 'Fixed demo clock, not the wall clock' },
    day: { start: DAY_START, end: DAY_END },
    settings: state.settings,
    limits: SETTING_LIMITS,
    rules: RULE_TEXT(state.settings),
    caregivers: state.caregivers,
    visits,
    gaps,
    stats,
    statsLabel: 'Sample stats, computed server-side from current state',
  };
}

export function presentVisit(state: DayState, id: string) {
  const v = evaluate(state.visits, state.caregivers, state.settings).visits.find((x) => x.id === id);
  if (!v) throw new HttpError(404, 'visit not found');
  return {
    ...v,
    notesLabel: 'Synthetic sample notes',
    history: state.events.filter((e) => e.visitId === id),
    historyLabel: 'Append-only log. "action" entries are real actions taken through this API; "seeded" entries are demo fixtures.',
  };
}
