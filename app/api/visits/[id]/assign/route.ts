import { visitAction } from '@/lib/visit-route';
import { assign } from '@/lib/ops';
import { parseAssign } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const POST = visitAction((s, id, now, body) => assign(s, id, parseAssign(body).caregiverId, now), true);
