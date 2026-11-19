import type { presentBoard, presentVisit } from './board';

export type BoardData = ReturnType<typeof presentBoard>;
export type VisitData = ReturnType<typeof presentVisit>;
export type BoardVisit = BoardData['visits'][number];

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `request failed (${res.status})`);
  return data as T;
}
