import { route } from '@/lib/api';
import { presentBoard } from '@/lib/board';

export const dynamic = 'force-dynamic';

export const GET = route(false, async ({ owner, store }) => presentBoard(await store.load(owner)));
