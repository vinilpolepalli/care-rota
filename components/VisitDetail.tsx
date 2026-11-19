'use client';
import type { BoardData, VisitData } from '@/lib/client';
import { fmt } from '@/lib/time';
import { FlagTag, StatusPill } from './ui';

interface Props {
  board: BoardData;
  visit: VisitData | null;
  busy: boolean;
  onAction: (id: string, action: 'en-route' | 'start' | 'complete') => void;
  onAssign: (id: string, caregiverId: string | null) => void;
}

const stamp = (at: string, source: string) => (source === 'seeded' ? at : new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

export function VisitDetail({ board, visit, busy, onAction, onAssign }: Props) {
  if (!visit) return <section aria-label="Visit detail" className="card p-4 text-sm text-ink-faint">Select a visit to see its checklist, flags and history.</section>;
  const locked = visit.status === 'in_progress' || visit.status === 'completed';
  return (
    <section aria-label="Visit detail" className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{visit.client}</h2>
          <p className="font-mono text-xs text-ink-soft">{visit.id} - {fmt(visit.start)}-{fmt(visit.end)} - {visit.area || 'no area'}</p>
        </div>
        <StatusPill status={visit.display} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="label">Caregiver</span>
          <select className="field !w-auto" disabled={busy || locked} value={visit.caregiverId ?? ''}
            onChange={(e) => onAssign(visit.id, e.target.value || null)}>
            <option value="">Unassigned</option>
            {board.caregivers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="btn" disabled={busy || visit.status !== 'scheduled' || !visit.caregiverId} onClick={() => onAction(visit.id, 'en-route')}>Mark en route</button>
        <button className="btn-primary" disabled={busy || !visit.caregiverId || (visit.status !== 'scheduled' && visit.status !== 'en_route')} onClick={() => onAction(visit.id, 'start')}>Start visit</button>
        <button className="btn" disabled={busy || visit.status !== 'in_progress'} onClick={() => onAction(visit.id, 'complete')}>Complete visit</button>
      </div>

      <h3 className="label mt-4">Rules evaluated</h3>
      {visit.flags.length === 0 ? <p className="mt-1 text-sm text-ink-soft">No attention flags.</p> : (
        <ul className="mt-1 space-y-2">
          {visit.flags.map((f) => (
            <li key={f.kind} className="rounded-field border border-hair p-2 text-sm">
              <FlagTag kind={f.kind} /> <span className="text-ink-soft">{f.state}</span>
              <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 font-mono text-xs text-ink-soft">
                {f.compared.map((c) => <div key={c.label} className="contents"><dt>{c.label}</dt><dd className="text-right text-ink">{c.value}</dd></div>)}
                <dt>threshold</dt><dd className="text-right text-ink">{f.threshold === null ? 'n/a' : `${f.threshold} min`}</dd>
              </dl>
            </li>
          ))}
        </ul>
      )}

      <h3 className="label mt-4">Tasks</h3>
      <ul className="mt-1 space-y-1 text-sm">
        {visit.tasks.length === 0 && <li className="text-ink-faint">No tasks listed.</li>}
        {visit.tasks.map((t) => <li key={t.label} className="flex gap-2"><span aria-hidden className="font-mono text-ink-faint">{t.done ? '[x]' : '[ ]'}</span><span className={t.done ? 'text-ink-faint line-through' : ''}>{t.label}</span></li>)}
      </ul>

      <h3 className="label mt-4">Notes <span className="normal-case">(synthetic)</span></h3>
      {visit.notes.length === 0 ? <p className="mt-1 text-sm text-ink-faint">None.</p> : visit.notes.map((n) => <p key={n} className="mt-1 text-sm text-ink-soft">{n}</p>)}

      <h3 className="label mt-4">Status history</h3>
      <p className="mt-0.5 text-xs text-ink-faint">Append-only. &quot;action&quot; rows are real actions taken through the API in this session; &quot;seeded&quot; rows are demo fixtures.</p>
      <ol className="mt-1 space-y-1 text-sm" data-testid="history">
        {[...visit.history].reverse().map((e) => (
          <li key={e.seq} className="grid grid-cols-[4.5rem_3.5rem_1fr] gap-2">
            <span className="font-mono text-xs text-ink-soft">{stamp(e.at, e.source)}</span>
            <span className={`font-mono text-[11px] ${e.source === 'action' ? 'text-sky' : 'text-ink-faint'}`}>{e.source}</span>
            <span>{e.action}{e.detail ? ` - ${e.detail}` : ''}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
