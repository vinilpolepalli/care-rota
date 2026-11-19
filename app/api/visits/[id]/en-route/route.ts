import { visitAction } from '@/lib/visit-route';
import { enRoute } from '@/lib/ops';

export const dynamic = 'force-dynamic';

export const POST = visitAction((s, id, now) => enRoute(s, id, now));
