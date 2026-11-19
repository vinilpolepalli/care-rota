import { visitAction } from '@/lib/visit-route';
import { complete } from '@/lib/ops';

export const dynamic = 'force-dynamic';

export const POST = visitAction((s, id, now) => complete(s, id, now));
