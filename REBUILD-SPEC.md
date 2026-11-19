# Care Rota v2 - high-fidelity rebuild spec

Rebuild this static demo into a real working product with a live backend. Maps to Cova (cova.care, YC S26): a licensed home care agency in Michigan whose AI agents run the entire back office - coordination, scheduling, billing - so caregiver pay can be the highest in the state. Care Rota demonstrates the operations core: a persisted day-operations board where visits are assigned, started, completed and rescheduled, and deterministic attention rules (late risk, coverage gaps, uncovered visits) recompute server-side from live state.

Do not deploy, do not git commit, do not push. No paid services, no API keys, no randomness (pure functions).

## Architecture
- Next.js App Router + TypeScript + Tailwind, SERVER runtime (remove output:'export'). Model the architecture on ~/proj/marengo-grid-plan (lib/api.ts route helper, lib/db drizzle store, lib/validate.ts, owner cookie, rate limiting) - read it first.
- Drizzle ORM: SQLite (carerota.db) dev; Postgres via DATABASE_URL prod.
- The rules engine (LATE RISK, GAP, UNCOVERED, status derivation) is the pure tested core, server-side, unit-tested (npm test). Thresholds are editable, visible settings stored per owner.

## Product workflow (fitted to THIS product)
1. Home = the day board: visits sorted by time with status pills and attention flags; first useful action above the fold on mobile.
2. Real operations, persisted: assign/reassign caregiver to a visit, mark en route, start visit, complete visit, add an unassigned visit. Each mutation re-derives flags server-side. Fixed demo clock "now" = 10:15, shown in UI (state changes are real; the clock is a stated demo constant).
3. Rules (thresholds editable per owner, displayed in UI): LATE RISK (not started, starts within 30 min of now, caregiver assigned but not en route); GAP (same caregiver, >90 min between consecutive visits, flagged on the following visit); UNCOVERED (no caregiver assigned on upcoming/at-risk visits). Each flag shows state, threshold and compared values.
4. Visit detail: tasks checklist, synthetic notes (marked synthetic), and a REAL status history - an append-only log of actual actions taken through the API, not seeded fake history.
5. Caregiver timeline: per-caregiver day strip 07:00-19:00 with visit blocks, gaps marked, now marker; click selects visit; stacks at 390px (timeline scrolls in its own container).
6. Stats strip computed server-side from live data, labeled sample stats: visits covered %, avg gap minutes, completed count.
7. Reset-to-demo button restores the seeded day. Fresh visitors get the seeded Demo Care Agency; edits are their own.

## Truthfulness bar
- Header badge "Sample data - demo"; all clients/caregivers/visits synthetic; rules are fixed-threshold illustrations, not a care-management product.
- Status history contains only real actions taken in this session (labeled as such); seeded entries, if any, are marked "seeded".
- Footer: "Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by Cova."

## Abuse and isolation controls
- Owner cookie (cr_uid, httpOnly); all data owner-scoped; cross-owner 403/404.
- Rate limits: 120 writes/hour/owner persisted in DB, 413 at 20KB; inputs validated (times within the day, caregiver must exist, no double-booking a caregiver on overlapping visits - 409 on conflict).

## UI bar
- Light theme, near-white ground, hairlines, small-caps labels, tabular nums, system stack; mono for figures. NOT the old dark/fuchsia theme.
- Brand accent: cyan #0e7490 is taken by a sibling; use sky #0369a1 (hover #075985). Deliberate: calm operational/dispatch read for a care-coordination board, clearly blue-sky and distinct from sibling blue #1d4ed8 (deeper) and every other sibling accent; not the indigo/violet band. Comment the rationale in tailwind.config.ts.
- Pills only for status chips; buttons 8px, cards 10px, inputs 8px; no gradients, no emoji icons, no hero+3-cards, no amber-50 fills.
- Layout fitted to a dispatch board (board left, detail right, timeline below), not a clone of sibling demos. Mobile: stacked.

## Definition of done
- npm run build + npm test pass.
- Real end-to-end: run server; hand-check flag derivation against the rules by independent recomputation; assign/start/complete a visit and verify flags and stats recompute; attempt an overlapping double-booking and verify 409; verify status history records the real actions; persistence across restart; owner isolation; rate limit.
- python3 ~/unslop/devibe_scan.py . - zero high or justified unslop-ignore comments.
- README + IMPLEMENTATION.md (data model, endpoints, verification results).
- Screenshots to /tmp: cr2-board.png, cr2-detail.png, cr2-timeline.png, cr2-mobile.png (390px) from the RUNNING app.
