# Railway preview review ledger (2026-11-27)

Scope: `railway/dining-car` (best next fix from the 2026-11-23 ledger) and five railway assets that
no earlier ledger lists. Each preview was opened and compared with the part list in its source.
Montage: [preview-review-six-assets.png](preview-review-six-assets.png). Source and preview
SHA-256 values are for the files before this change.

| Asset | Source / preview SHA-256 (first 12) | Preview check | Finding | Other noted limits (not fixed) |
| --- | --- | --- | --- | --- |
| `dining-car` | `0485e94487a4` / `bc91641cb8f4` | Reads as a brown coach with six windows and a roof vent on four near-side wheels. | **Fixed this round.** All four wheels at `y = -170`, outside the 155 mm body half-width; the far rail has no wheels. No bogie part: the wheel tops (z 156) push into the underframe (z 121-203), with no frame, axle or bolster. Windows on the near side only. The description names end doors; the source has none. Nothing separates it from `passenger-coach` (no galley). | `mechanism.interpenetration` badge in `render inspect` before and after (overlapping parts; not caused by this change). |
| `maintenance-railcar` | `7a703256b86a` / `6bd00c8c1973` | Reads as a yellow cab and deck with a grey tool cabinet and a roof beacon. | Geometry: all four wheels at `y = -160`; the far rail has no wheels (same defect class as `dining-car`). Wheel tops (z 152) push into the frame (z 117-207). Materials coherent (high-visibility cab, amber beacon glass). | No cab windows, handrails or couplers. Best next fix in this kit. |
| `handcar` | `947c679014bf` / `3afef0348835` | Reads as a plank platform with a pump post and a walking-beam handle with grips. | Geometry: wheels on both sides, but the centres are at `y = -184` and `y = +128`, so the wheel track is 28 mm off the car centre line. No axle joins the wheels. Materials coherent (timber deck, rubber grips). | Pump beam has no linkage to an axle. |
| `inspection-trolley` | `c5e99f2d31d8` / `f52179c51bcd` | Reads as a small grey trolley with a timber seat, a tool box and a handle bar. | Geometry: wheel centres at `y = -145` and `y = +85`; the near pair stands outside the 230 mm chassis and the far pair under it, so the track is 30 mm off centre. | The whole `handlebar` bar is `rubber`; only the grips would be rubber on a steel bar. Weak material finding. |
| `buffer-stop` | `d06837547ca7` / `f47730747be4` | Reads as two short rails on three sleepers with two posts, a beam and two black discs at the far end. | Geometry: the `pad-left`/`pad-right` cylinders have their axes along Y, so the pad faces point across the track, not toward an approaching train. The pad centres (x 330) stand 2 mm beyond the far face of the crossbeam (x 272-328), on the side away from the track (rails x -325 to 325). | Posts stand on the rails with no foundation or bracing struts. |
| `signal-gantry` | `23d82a679c65` / `c23396820376` | Reads as two towers and a crossbeam with a red and an amber signal head. | Geometry: `ladder-left`/`ladder-right` are single 180 x 28 x 20 mm horizontal bars at z 240-260 that cross each tower; there are no stiles or rungs, so no ladder reads. The walkway has no handrail. Materials coherent. | Towers are single 50 mm posts, not lattice towers. |

Decision: fix `dining-car` this round (worst defect: no running gear and one-sided wheels). Next
candidates in priority order: `maintenance-railcar` (one-sided wheels), `buffer-stop` (pad
orientation), `signal-gantry` (ladders). Railway assets in no ledger after this round: 24 of 40 (scan of `| `id` |` rows in `artifacts/catalog-demos/railway-*/preview-review.md`).
