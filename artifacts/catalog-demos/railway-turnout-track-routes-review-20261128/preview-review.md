# Railway preview review ledger (2026-11-28)

Scope: `railway/turnout-track` (best next fix from the maintenance-railcar ledger of 2026-11-27)
and five railway assets that no earlier ledger lists. Each preview was opened and compared with
the part list in its source. Montage: [preview-review-six-assets.png](preview-review-six-assets.png).
Source and preview SHA-256 values are for the files before this change.

| Asset | Source / preview SHA-256 (first 12) | Preview check | Finding | Other noted limits (not fixed) |
| --- | --- | --- | --- | --- |
| `turnout-track` | `6b2ccaa57e02` / `595e7a48e461` | Reads as a straight track with one rail branching off at an angle over a ballast slab. | **Fixed this round.** The diverging route has one rail (`branch-rail`), so no vehicle can take it. The branch rail runs to `y` about 360, beyond the 240 mm ballast half-width and the 230 mm sleeper half-length. No switch blades, stretcher bars, point machine, frog nose, wing rails or check rails. | `mechanism.interpenetration` badge in `render inspect` before and after (not caused by this change). |
| `curved-track` | `29b3fc5caa18` / `393d2f826fdf` | Reads as a closed ring of two rails on a ballast ring; no sleepers are visible. | Geometry: every `sleeper-N` is a 340 x 40 mm box whose long side is tangent to the ring (for example `sleeper-1` at (0, -625) has its 340 mm side along X), so each sleeper runs along the rails, under them, not across them. The sleepers are hidden in the preview. | **Best next fix in this kit.** The rails are 50 mm wide rings, wider than the 34 mm straight-track rails. |
| `straight-track` | `fa25d13639a0` / `655c4ef0b44c` | Reads as two rails on six sleepers over a ballast strip. | Plausible. Rails (z 36-90) push 18 mm into the sleepers (z 18-54). | Gauge 168 mm (rails at y +-84); `turnout-track` and `curved-track` use other gauges, so the track pieces do not join. |
| `rail-sleeper` | `ab26953c2a81` / `25aee7371884` | Reads as a concrete block with two raised steel plates and four bolts. | Geometry: the beam is 300 mm along the rails and 250 mm across them; a sleeper is many times longer across the track than it is wide. The rail plates reach y +-140 and the bolts y +-128, past the 125 mm beam end. | No rail clip or pad. |
| `level-crossing` | `ec70b81a4c4f` / `663e2bde4891` | Reads as two rails over a dark road slab with two yellow T-shaped posts. | Geometry and label: the road panels are outside the rails only (y +-210); there is no panel between the rails, and the description names "flangeway grooves" that no part models. The warning posts carry a straight crossbar, not a crossbuck. | Rails run 370 mm past the road on each side with no sleepers. |
| `tank-wagon` | `de3edf86e24c` / `e00e3b95c674` | Reads as a black tank wagon with a walkway, dome, ladder, hazard placards and two bogies. | Plausible. No defect found in the preview. | Not checked against a drawing. |

Decision: fix `turnout-track` this round (worst defect: a route with one rail). Next candidates in
priority order: `curved-track` (sleepers along the rails), `rail-sleeper` (proportions, overhang),
`level-crossing` (no centre panel; label), `buffer-stop`, `semaphore-signal` and `signal-gantry`
(from earlier ledgers). Railway assets in no ledger after this round: 14 of 40 (scan of `| `id` |`
rows in `artifacts/catalog-demos/railway-*/preview-review.md`).
