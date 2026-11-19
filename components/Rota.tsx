'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type BoardData, type VisitData } from '@/lib/client';
import { Board } from './Board';
import { AddVisit, SettingsPanel, Stats } from './Panels';
import { Timeline } from './Timeline';
import { VisitDetail } from './VisitDetail';

export function Rota() {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [visit, setVisit] = useState<VisitData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const loadVisit = useCallback(async (id: string) => {
    try { setVisit((await api<{ visit: VisitData }>(`/api/visits/${id}`)).visit); } catch (e) { setError((e as Error).message); }
  }, []);

  useEffect(() => { api<BoardData>('/api/board').then(setBoard).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (selected) void loadVisit(selected); else setVisit(null); }, [selected, loadVisit]);

  const select = (id: string) => {
    setSelected(id);
    if (window.matchMedia('(max-width: 1023px)').matches) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  /** Run a mutation; every response carries the re-derived board. */
  async function mutate(path: string, method: string, body?: unknown, after?: (r: { board: BoardData; visit?: VisitData }) => void) {
    setBusy(true); setError(null);
    try {
      const r = await api<{ board: BoardData; visit?: VisitData }>(path, method, body);
      setBoard(r.board);
      if (r.visit) setVisit(r.visit); else if (selected) await loadVisit(selected);
      after?.(r);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (!board) return <main className="p-6 text-sm text-ink-soft">{error ?? 'Loading board...'}</main>;

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-10">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hair py-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold">Care Rota <span className="font-normal text-ink-faint">- {board.agency}</span></h1>
          <span className="pill border-sky bg-white text-sky">{board.label}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span title={board.now.note}><span className="label">Demo clock</span> <span className="font-mono">{board.now.label}</span></span>
          <button className="btn" disabled={busy} onClick={() => { if (confirm('Restore the seeded demo day? Your edits and history will be cleared.')) { setSelected(null); void mutate('/api/reset', 'POST'); } }}>Reset to demo</button>
        </div>
      </header>

      <p className="py-2 text-xs text-ink-soft">All clients, caregivers and visits are synthetic. Rules are fixed-threshold illustrations, not a care-management product. State changes you make are real and persisted; the 10:15 clock is a stated demo constant.</p>
      {error && <p role="alert" className="mb-2 rounded-field border border-bad px-3 py-2 text-sm text-bad">{error}</p>}

      <Stats board={board} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-soft">Next up: pick a visit to assign, dispatch or start.</span>
            <button className="btn" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>{adding ? 'Close' : 'Add visit'}</button>
          </div>
          {adding && <AddVisit board={board} busy={busy} onAdd={(v) => mutate('/api/visits', 'POST', v, (r) => { if (r.visit) setSelected(r.visit.id); setAdding(false); })} />}
          <Board board={board} selected={selected} onSelect={select} />
        </div>
        <div ref={detailRef} className="space-y-4 lg:sticky lg:top-3 lg:self-start">
          <VisitDetail board={board} visit={visit} busy={busy}
            onAction={(id, a) => mutate(`/api/visits/${id}/${a}`, 'POST')}
            onAssign={(id, cg) => mutate(`/api/visits/${id}/assign`, 'POST', { caregiverId: cg })} />
          <SettingsPanel key={`${board.settings.lateWindowMin}-${board.settings.gapThresholdMin}`} board={board} busy={busy}
            onSave={(late, gap) => mutate('/api/settings', 'PUT', { lateWindowMin: late, gapThresholdMin: gap })} />
        </div>
      </div>

      <div className="mt-4"><Timeline board={board} selected={selected} onSelect={select} /></div>

      <footer className="mt-8 border-t border-hair pt-3 text-xs text-ink-faint">Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by Cova.</footer>
    </div>
  );
}
