import { route } from '@/lib/api';
import { presentBoard, presentVisit } from '@/lib/board';
import { addVisit } from '@/lib/ops';
import { nowIso } from '@/lib/clock';
import { parseAddVisit } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const POST = route(true, async ({ owner, store, body }) => {
  const input = parseAddVisit(body());
  const state = await store.mutate(owner, (s) => addVisit(s, input, nowIso()));
  const id = state.visits.reduce((m, v) => Math.max(m, Number(v.id.slice(1)) || 0), 0);
  return { visit: presentVisit(state, `v${id}`), board: presentBoard(state) };
});
