import type { Change, DayState } from '../types';

export interface Store {
  /** The owner's day; seeds the demo agency on first use. */
  load(owner: string): Promise<DayState>;
  /**
   * Run a pure operation atomically: load state, compute a Change (may throw HttpError), persist it.
   * Returns the new state. Serialised per owner so overlap checks cannot race.
   */
  mutate(owner: string, fn: (s: DayState) => Change): Promise<DayState>;
  /** Wipe the owner's day and restore the seeded one (history included). */
  reset(owner: string): Promise<DayState>;
  /** Count one write in the current hour; false when over the limit. */
  allowWrite(owner: string, limit: number, now?: number): Promise<boolean>;
}

let instance: Promise<Store> | null = null;
export function getStore(): Promise<Store> {
  if (!instance) {
    instance = process.env.DATABASE_URL
      ? import('./pg').then((m) => m.createPgStore(process.env.DATABASE_URL as string))
      : import('./sqlite').then((m) => m.createSqliteStore(process.env.CAREROTA_DB || 'carerota.db'));
  }
  return instance;
}
