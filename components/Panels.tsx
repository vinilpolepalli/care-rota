'use client';
import { useState } from 'react';
import type { BoardData } from '@/lib/client';

export function Stats({ board }: { board: BoardData }) {
  const s = board.stats;
  const items = [
    ['Visits covered', `${s.coveredPct}%`],
    ['Avg gap', `${s.avgGapMin} min`],
    ['Completed', `${s.completed} / ${s.total}`],
  ];
  return (
    <section aria-label="Sample stats" className="card grid grid-cols-3 divide-x divide-hair">
      {items.map(([k, v]) => (
        <div key={k} className="px-3 py-2">
          <div className="label">{k}</div>
          <div className="font-mono text-xl">{v}</div>
        </div>
      ))}
      <p className="col-span-3 border-t border-hair px-3 py-1 text-xs text-ink-faint">Sample stats - {board.statsLabel.replace('Sample stats, ', '')}</p>
    </section>
  );
}

export function SettingsPanel({ board, busy, onSave }: { board: BoardData; busy: boolean; onSave: (late: number, gap: number) => void }) {
  const [late, setLate] = useState(String(board.settings.lateWindowMin));
  const [gap, setGap] = useState(String(board.settings.gapThresholdMin));
  const L = board.limits;
  return (
    <section aria-label="Rule thresholds" className="card p-4">
      <h2 className="label">Rules and thresholds</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
        {board.rules.map((r) => <li key={r.kind}><span className="font-mono text-xs font-semibold text-ink">{r.kind}</span> {r.text}</li>)}
      </ul>
      <form className="mt-3 grid grid-cols-2 gap-2" onSubmit={(e) => { e.preventDefault(); onSave(Number(late), Number(gap)); }}>
        <label className="text-xs"><span className="label block">Late window (min)</span>
          <input className="field font-mono" type="number" min={L.lateWindowMin[0]} max={L.lateWindowMin[1]} value={late} onChange={(e) => setLate(e.target.value)} /></label>
        <label className="text-xs"><span className="label block">Gap threshold (min)</span>
          <input className="field font-mono" type="number" min={L.gapThresholdMin[0]} max={L.gapThresholdMin[1]} value={gap} onChange={(e) => setGap(e.target.value)} /></label>
        <button className="btn-primary col-span-2" disabled={busy}>Save thresholds</button>
      </form>
      <p className="mt-2 text-xs text-ink-faint">Fixed-threshold illustrations, not a care-management product. Saved per owner.</p>
    </section>
  );
}

export function AddVisit({ board, busy, onAdd }: { board: BoardData; busy: boolean; onAdd: (v: Record<string, unknown>) => void }) {
  const [client, setClient] = useState('');
  const [area, setArea] = useState('');
  const [start, setStart] = useState('14:30');
  const [end, setEnd] = useState('15:30');
  const [cg, setCg] = useState('');
  return (
    <form className="card grid grid-cols-2 gap-2 p-3" aria-label="Add visit"
      onSubmit={(e) => { e.preventDefault(); onAdd({ client, area, start, end, caregiverId: cg || null, tasks: [] }); setClient(''); }}>
      <label className="col-span-2 text-xs"><span className="label block">Client (synthetic name)</span>
        <input className="field" required maxLength={60} value={client} onChange={(e) => setClient(e.target.value)} /></label>
      <label className="text-xs"><span className="label block">Start</span><input className="field font-mono" type="time" min="07:00" max="19:00" required value={start} onChange={(e) => setStart(e.target.value)} /></label>
      <label className="text-xs"><span className="label block">End</span><input className="field font-mono" type="time" min="07:00" max="19:00" required value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      <label className="text-xs"><span className="label block">Area</span><input className="field" maxLength={40} value={area} onChange={(e) => setArea(e.target.value)} /></label>
      <label className="text-xs"><span className="label block">Caregiver</span>
        <select className="field" value={cg} onChange={(e) => setCg(e.target.value)}>
          <option value="">Unassigned</option>
          {board.caregivers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></label>
      <button className="btn-primary col-span-2" disabled={busy}>Add visit</button>
    </form>
  );
}
