import { route } from '@/lib/api';
import { presentBoard } from '@/lib/board';
import { parseSettings } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = route(false, async ({ owner, store }) => {
  const s = await store.load(owner);
  return { settings: s.settings };
});

export const PUT = route(true, async ({ owner, store, body }) => {
  const settings = parseSettings(body());
  return { board: presentBoard(await store.mutate(owner, () => ({ visits: [], events: [], settings }))) };
});
