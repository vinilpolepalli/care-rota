# Care Rota — SPEC

Independent demo inspired by the problem space of Cova (YC S26). Not affiliated. Fictional agency: "Demo Care Agency".

## Honesty requirements
- Header badge: "Sample data - demo".
- Intro copy: all clients, caregivers and visits are synthetic; rules are fixed-threshold illustrations, not a care-management product.
- Footer: "Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by Cova."
- Caregiver notes marked "Synthetic".
- Stats labeled "sample stats".
- No runtime external calls (no fonts/CDN/analytics/fetch).

## Tech
Next.js (App Router), TypeScript, `output: 'export'`, plain CSS. `npm run build` must pass.

## Slices
1. **Data** (`lib/data.ts`): 5 caregivers, 12 visits, 1 day. Fixed "now" = 10:15 (demo clock, shown in UI). Each visit: id, client, caregiver|null, start, end, status, enRoute flag, tasks, notes, history.
2. **Rules** (`lib/rules.ts`): fixed thresholds, displayed in UI.
   - LATE RISK: visit not started, starts within 30 min of now (0..30), caregiver assigned but not en route.
   - GAP: same caregiver, >90 min between end of one visit and start of next (flag on the following visit).
   - UNCOVERED: no caregiver assigned (upcoming/at-risk visits).
3. **Day board**: visits sorted by time, status pills (completed / in progress / upcoming / missed risk), attention flags, filter by status/attention.
4. **Visit detail**: selecting a visit shows checklist, synthetic notes, status history.
5. **Caregiver timeline**: per caregiver horizontal day strip 07:00–19:00 with visit blocks, gaps marked, now marker. Click block selects visit. Stacks usable at 390px.
6. **Stats strip**: visits covered %, avg gap minutes, completed count — computed from data.

## Status derivation
Status is stored in data; "missed risk" = status for visits flagged by LATE RISK (derived: displayed as missed risk when late risk fires or the visit start has passed without starting).

## UI
Dark, fuchsia accent `#d946ef`. Desktop two/three-column; single column ≤ 800px, usable at 390px (no horizontal page scroll; timeline scrolls inside its own container).
