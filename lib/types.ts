export type Status = 'scheduled' | 'en_route' | 'in_progress' | 'completed';

export interface Caregiver { id: string; name: string; initials: string }
export interface Task { label: string; done: boolean }

/** A stored visit. Times are minutes since midnight. */
export interface VisitRec {
  id: string;
  client: string;
  area: string;
  caregiverId: string | null;
  start: number;
  end: number;
  status: Status;
  tasks: Task[];
  notes: string[]; // synthetic seed notes only
}

export interface Settings { lateWindowMin: number; gapThresholdMin: number }

/** Append-only status history. source 'seeded' = demo fixture; 'action' = a real API action. */
export interface EventRec {
  seq: number;
  visitId: string;
  source: 'seeded' | 'action';
  at: string; // seeded: "HH:MM" label; action: ISO timestamp of the real action
  action: string;
  detail: string;
}
export type NewEvent = Omit<EventRec, 'seq'>;

export interface DayState {
  caregivers: Caregiver[];
  visits: VisitRec[];
  settings: Settings;
  events: EventRec[];
}

/** Result of a pure operation: rows to upsert and events to append. */
export interface Change { visits: VisitRec[]; events: NewEvent[]; settings?: Settings }
