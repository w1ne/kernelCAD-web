# Five-preview shipyard manufacturing audit — 18 November 2026

PR #1258 was checked first: merged, with all 17 reported checks successful and
no submitted review. The current catalog PR #1507 is open; its full changed-file
set contains no selected shipyard asset. Seven open issues and six open PRs were
scanned for the five selected IDs. The exact scan is in
[`verification/open-target-check.json`](verification/open-target-check.json).
The selected source paths also do not overlap fixes #1298, #1305, #1307, or
#1308 ([overlap evidence](verification/prior-fix-overlap-check.json)).

All five checked-in previews were opened. Their pages returned HTTP 200 and the
public preview PNG hashes matched the local baseline
([public baseline](live-baseline/public-check.json)).

| Asset | Indexed triangles / budget | Indexed envelope (m, X/Y-up/Z) | Preview review |
| --- | ---: | ---: | --- |
| `coating-mix-cabinet` | 224 / 1,800 | 2.03 × 2.36 × 0.96 | Reads as a ventilated cabinet with paired doors, a mixing worktop, hood, vent stack and side shelf. Low detail, but no supported material mismatch or false label found. |
| `optical-measurement-station` | 276 / 1,800 | 0.82 × 1.85 × 0.99 | Instrument housing, forward lens ring, target mast and tripod are visible; two legs read clearly from this angle. The yellow lens ring is unusual, but this pass did not establish a wrong material. |
| `pipe-spool-saddle-stand` | 224 / 1,800 | 1.60 × 1.45 × 0.715 | Reads as a pipe support trestle. The modeled saddle cap is a flat bar rather than a concave cradle, so the title overstates the contact profile; recorded as an unresolved geometry/label concern. |
| `plate-roller-conveyor` | 440 / 1,800 | 2.55 × 0.575 × 1.54 | Six transverse rollers, two side frames, guide rails and leveling feet read as a plate-feed conveyor. Its source-space extents are 2.55 × 1.50 × 0.575 m. Before the fix, the mirrored side frames had different finishes despite matching size and function. |
| `temporary-work-light-mast` | 364 / 1,800 | 1.74 × 3.32 × 1.16 | Tall telescoping mast, four lamps and crossed stabilizers read as a portable work light. No material mismatch established. |

## Selected correction

`plate-roller-conveyor/side-frame-1` used `structuralSteel` (#b6c1c4), while
the geometrically mirrored `side-frame-0` used `yardPaint` (#78847e). The
preview showed one painted side frame and one bare-steel-colored side frame.
Both now use `yardPaint`. The rollers, guide rails and feet retain
`structuralSteel`. Geometry, dimensions, controls, presets and the 440-triangle
mesh are unchanged.

The focused exported-GLB regression failed on the retained baseline source and
passed after the one-part reassignment. It checks both side frames against the
yard finish and checks representative rollers, guide rails and feet against
structural steel. Before/after default previews are in [`before/`](before/) and
[`after/`](after/).

The official Cochin Shipyard plate-preservation-line tender describes profile
steel, fabricated steel frames and steel rollers for its roller conveyors
([source PDF](https://cochinshipyard.in/uploads/TENDOR/d01953b339e2a4bc42f153c0d893354a.pdf)).
This is material context only; it does not establish a vendor-specific design
specification for the generic kernelCAD prop. The audit makes no manufacturing
or load-rating claim.
