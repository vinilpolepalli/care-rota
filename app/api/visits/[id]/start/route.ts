import { visitAction } from '@/lib/visit-route';
import { start } from '@/lib/ops';

export const dynamic = 'force-dynamic';

export const POST = visitAction((s, id, now) => start(s, id, now));
