'use client';
import type { BoardData } from '@/lib/client';
import { fmt } from '@/lib/time';

const HOURS = Array.from({ length: 13 }, (_, i) => 7 + i);
const BLOCK: Record<string, string> = {
  completed: 'bg-zinc-200 text-ink-soft border-zinc-300',
  'in progress': 'bg-sky text-white border-sky',
  'en route': 'bg-sky/20 text-sky border-sky/50',
  upcoming: 'bg-white text-ink border-ink-faint',
  'at risk': 'bg-white text-warn border-warn',
};

export function Timeline({ board, selected, onSelect }: { board: BoardData; selected: string | null; onSelect: (id: string) => void }) {
  const { start, end } = board.day;
  const span = end - start;
  const pct = (m: number) => `${((m - start) / span) * 100}%`;
  return (
    <section aria-label="Caregiver timeline">
      <h2 className="label mb-2">Caregiver timeline 07:00-19:00 - gaps over {board.settings.gapThresholdMin} min are dashed</h2>
      <div className="card overflow-x-auto" data-testid="timeline-scroll">
        <div className="min-w-[760px] p-3">
          <div className="relative ml-28 h-5 border-b border-hair font-mono text-[11px] text-ink-faint">
            {HOURS.map((h) => <span key={h} className="absolute -translate-x-1/2" style={{ left: pct(h * 60) }}>{String(h).padStart(2, '0')}</span>)}
          </div>
          {board.caregivers.map((c) => {
            const mine = board.visits.filter((v) => v.caregiverId === c.id);
            return (
              <div key={c.id} className="flex items-center border-b border-hair/60 py-1.5 last:border-0">
                <div className="w-28 shrink-0 truncate pr-2 text-sm">{c.name}</div>
                <div className="relative h-10 flex-1">
                  {HOURS.map((h) => <span key={h} className="absolute inset-y-0 w-px bg-hair/70" style={{ left: pct(h * 60) }} />)}
                  {board.gaps.filter((g) => g.caregiverId === c.id).map((g) => (
                    <span key={g.beforeVisitId} title={`${g.minutes} min gap ${fmt(g.from)}-${fmt(g.to)}`}
                      className={`absolute inset-y-3 flex items-center justify-center overflow-hidden font-mono text-[10px] ${g.flagged ? 'border-y border-dashed border-warn bg-warn/10 text-warn' : 'text-ink-faint'}`}
                      style={{ left: pct(g.from), width: `${(g.minutes / span) * 100}%` }}>
                      {g.minutes}m
                    </span>
                  ))}
                  {mine.map((v) => (
                    <button key={v.id} onClick={() => onSelect(v.id)} title={`${v.client} ${fmt(v.start)}-${fmt(v.end)} (${v.display})`}
                      className={`absolute inset-y-1 overflow-hidden rounded-[6px] border px-1 text-left text-[11px] leading-tight ${BLOCK[v.display]} ${selected === v.id ? 'ring-2 ring-sky ring-offset-1' : ''}`}
                      style={{ left: pct(v.start), width: `${((v.end - v.start) / span) * 100}%` }}>
                      <span className="block truncate font-medium">{v.client}</span>
                    </button>
                  ))}
                  <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-bad" style={{ left: pct(board.now.minutes) }} aria-label={`now ${board.now.label}`} />
                </div>
              </div>
            );
          })}
          <div className="relative ml-28 h-4 font-mono text-[11px] text-bad">
            <span className="absolute -translate-x-1/2" style={{ left: pct(board.now.minutes) }}>now {board.now.label}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
