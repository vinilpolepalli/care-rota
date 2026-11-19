import type { BoardVisit } from '@/lib/client';

const PILL: Record<BoardVisit['display'], string> = {
  completed: 'border-green-200 text-ok',
  'in progress': 'border-sky text-sky',
  'en route': 'border-sky/40 text-sky',
  upcoming: 'border-hair text-ink-soft',
  'at risk': 'border-warn text-warn',
};

export function StatusPill({ status }: { status: BoardVisit['display'] }) {
  return <span className={`pill bg-white ${PILL[status]}`}>{status}</span>;
}

/** Flags are rectangular tags, not pills (pills are reserved for status). */
export function FlagTag({ kind }: { kind: string }) {
  const tone = kind === 'UNCOVERED' ? 'border-bad text-bad' : 'border-warn text-warn';
  return <span className={`inline-block rounded-[4px] border px-1.5 py-px font-mono text-[11px] font-semibold ${tone}`}>{kind}</span>;
}
