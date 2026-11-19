import { route } from './api';
import { presentBoard, presentVisit } from './board';
import { nowIso } from './clock';
import type { Change, DayState } from './types';
import type { NextRequest } from 'next/server';

type P = { params: Promise<{ id: string }> };

/** POST /api/visits/[id]/<action>: applies a pure op and returns the updated visit and board. */
export function visitAction(op: (s: DayState, id: string, now: string, body: unknown) => Change, readsBody = false) {
  return async (req: NextRequest, p: P) => {
    const { id } = await p.params;
    return route(true, async ({ owner, store, body }) => {
      const b = readsBody ? body() : undefined;
      const state = await store.mutate(owner, (s) => op(s, id, nowIso(), b));
      return { visit: presentVisit(state, id), board: presentBoard(state) };
    })(req);
  };
}
