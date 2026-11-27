# Railway preview review ledger (2026-11-27, second round)

Scope: `railway/maintenance-railcar` (best next fix from the dining-car ledger of the same day) and
five railway assets that no earlier ledger lists. Each preview was opened and compared with the
part list in its source. Montage: [preview-review-six-assets.png](preview-review-six-assets.png).
Source and preview SHA-256 values are for the files before this change.

| Asset | Source / preview SHA-256 (first 12) | Preview check | Finding | Other noted limits (not fixed) |
| --- | --- | --- | --- | --- |
| `maintenance-railcar` | `7a703256b86a` / `6bd00c8c1973` | Reads as a yellow cab and deck with a grey tool cabinet, a roof beacon and four near-side wheels. | **Fixed this round.** All four wheels at `y = -160`; the far rail has no wheels. No axle, axle box or horn guide: the wheel tops (z 152) push into the frame (z 117-207). The cab is a solid box with no windows or doors. No handrails round the open deck, no buffers or couplers. | `mechanism.interpenetration` badge in `render inspect` before and after (overlapping parts; not caused by this change). |
| `turnout-track` | `6b2ccaa57e02` / `595e7a48e461` | Reads as a straight track with one rail branching off at an angle over a ballast slab. | Geometry: the diverging route has one rail (`branch-rail`), so no vehicle can take it. The branch rail runs to `y` about 360, beyond the 240 mm ballast half-width and the 230 mm sleeper half-length, so it overhangs with no support. No switch blades (points) or check rails. | **Best next fix in this kit.** |
| `semaphore-signal` | `3e416600b6bd` / `e49e21cbd8d1` | Reads as a mast with a yellow arm, a counterweight and four short bars across the mast. | Geometry: `ladder-1` to `ladder-4` are single 140 x 24 x 20 mm horizontal bars through the mast, with no stiles; no ladder reads (same defect class as `signal-gantry`). No spectacle glass or lamp. | Yellow arm with no chevron; plausible for a distant arm. |
| `crossing-gate` | `37382039d015` / `6bf2a77b42f3` | Reads as a post, a housing and a yellow barrier arm with pale bands and a lamp on a short post. | Material: the whole `lamp-head` box (84 x 62 x 104 mm) is `signalAmberGlass`; a lamp has a metal housing and a glass lens. | The lamp post stands on the barrier arm (x 80, z 500), not on the housing. |
| `signal-light` | `a3693f5f868b` / `50eba8e0daaa` | Reads as a three-aspect colour-light signal (red, amber, green) on a mast with hoods. | Label: the description names a "service ladder"; the source has no ladder part. Geometry and materials otherwise coherent. | Weak finding (label only). |
| `track-switch-lever` | `cb601c360ca7` / `7ceb2d06e09b` | Reads as a ground lever on a base with a rubber grip, a counterweight and a connecting rod. | Geometry: the lever box is rotated about its own centre (x 0, z 360), so its lower end (x about 93, z about 75) is not on the pivot post; the `grip` is centred on x 0 while the lever top is at x about -93. Weak finding. | No ground throw or switch rod clevis. |

Decision: fix `maintenance-railcar` this round (worst defect: one-sided wheels with no running gear).
Next candidates in priority order: `turnout-track` (single-rail branch), `buffer-stop` (pad
orientation), `semaphore-signal` and `signal-gantry` (ladders), `crossing-gate` (all-glass lamp).
Railway assets in no ledger after this round: 19 of 40 (scan of `| `id` |` rows in
`artifacts/catalog-demos/railway-*/preview-review.md`).
