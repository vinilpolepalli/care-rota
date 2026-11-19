import { route } from '@/lib/api';
import { presentVisit } from '@/lib/board';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = async (req: NextRequest, p: { params: Promise<{ id: string }> }) => {
  const { id } = await p.params;
  return route(false, async ({ owner, store }) => ({ visit: presentVisit(await store.load(owner), id) }))(req);
};
