'use client';
import { useState } from 'react';
import type { BoardData } from '@/lib/client';
import { fmt } from '@/lib/time';
import { FlagTag, StatusPill } from './ui';

const FILTERS = ['all', 'needs attention', 'completed'] as const;

export function Board({ board, selected, onSelect }: { board: BoardData; selected: string | null; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const name = (id: string | null) => board.caregivers.find((c) => c.id === id)?.name ?? null;
  const rows = board.visits.filter((v) =>
    filter === 'all' ? true : filter === 'completed' ? v.status === 'completed' : v.flags.length > 0);

  return (
    <section aria-label="Day board">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="label">Day board - {board.visits.length} visits</h2>
        <div role="group" aria-label="Filter visits" className="flex gap-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`rounded-btn border px-2.5 py-1 text-xs ${filter === f ? 'border-sky bg-sky text-white' : 'border-hair bg-white text-ink-soft hover:bg-zinc-50'}`}>{f}</button>
          ))}
        </div>
      </div>
      <ul className="card divide-y divide-hair">
        {rows.length === 0 && <li className="p-4 text-sm text-ink-faint">No visits match this filter.</li>}
        {rows.map((v) => (
          <li key={v.id}>
            <button onClick={() => onSelect(v.id)} aria-current={selected === v.id}
              className={`grid w-full grid-cols-[4.5rem_1fr_auto] items-start gap-x-3 gap-y-1 border-l-2 px-3 py-2.5 text-left hover:bg-zinc-50 ${selected === v.id ? 'border-sky bg-sky/5' : 'border-transparent'}`}>
              <span className="font-mono text-sm">{fmt(v.start)}<span className="block text-xs text-ink-faint">{fmt(v.end)}</span></span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{v.client} <span className="font-normal text-ink-faint">{v.area}</span></span>
                <span className={`block truncate text-xs ${v.caregiverId ? 'text-ink-soft' : 'text-bad'}`}>{name(v.caregiverId) ?? 'No caregiver'}</span>
                {v.flags.length > 0 && <span className="mt-1 flex flex-wrap gap-1">{v.flags.map((f) => <FlagTag key={f.kind} kind={f.kind} />)}</span>}
              </span>
              <StatusPill status={v.display} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
