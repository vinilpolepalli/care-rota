import { route } from '@/lib/api';
import { presentBoard } from '@/lib/board';

export const dynamic = 'force-dynamic';

export const POST = route(true, async ({ owner, store }) => ({ board: presentBoard(await store.reset(owner)) }));
