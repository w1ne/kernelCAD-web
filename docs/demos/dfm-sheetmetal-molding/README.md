# dfm_review: sheet metal and injection molding

`dfm_review` now takes `processes: ['sheet-metal']` and
`processes: ['injection-molding']` next to `'fdm'` and `'cnc'` (the default is
still `['fdm', 'cnc']`). Each process adds rows to the same checklist
(`{ id, process, part, status: pass|fail|warn, summary, value?, limit? }`)
plus a per-process report with locations (`sheetMetal[]`, `injectionMolding[]`).

[demo.mp4](demo.mp4) (24 s, 1280x720): the new check ids, then four
dfm_review runs, each next to its `render inspect` views:

| part | process | result |
| --- | --- | --- |
| [`tray-undrafted.kcad.ts`](tray-undrafted.kcad.ts) | injection-molding | fail: `mold.draft` (10 straight walls, named by `@kc` face ref), `mold.undercuts` (the side window, 56 mm²), warn `mold.sharp-internal-corners` |
| [`tray-drafted.kcad.ts`](tray-drafted.kcad.ts) | injection-molding | pass: 2° draft inside and out, window removed (the sharp-corner warning stays; the pocket floor is not filleted) |
| [`bracket-tight.kcad.ts`](bracket-tight.kcad.ts) | sheet-metal | fail: `sheet.min-bend-radius` (R1 < 1 × 2 mm), `sheet.hole-to-bend` (hole edge 2 mm from the bend line, limit 2.5 × 2 + R1 = 6 mm, at flat (58, 20)) |
| [`bracket-fixed.kcad.ts`](bracket-fixed.kcad.ts) | sheet-metal | pass: R2 bend, hole moved 10 mm back |

The exact rows are in [`result.json`](result.json); stills of the four review
frames are `still-*.png`.

## Checks and defaults

Sheet metal runs on the flat pattern of a `sheetMetal(...)` chain
(`flattenPatternWithHoles`, the same machinery as `flatten_pattern`); the
thickness and K-factor come from the model. Any other part gets one
`sheet.not-sheet-metal` warn row. Defaults follow Fabcon's sheet-metal DFM
guide (R ≥ t; hole-to-bend 2.5 × t + R measured from the hole edge to the bend
line; hole-to-edge 2 × t, also Century-Tywood's reference; flange ≥ 4 × t
from the outside of the bend). Call options: `min_bend_radius_ratio`,
`hole_to_bend_thicknesses`, `hole_to_edge_thicknesses`, `min_flange_thicknesses`.

Injection molding runs the `dfmSpec({ process: 'moulding' })` engine
(`mouldingCheck.ts`): draft per BREP face against `pull_direction` (default
`+z`, `min_draft_deg` 1), two-part-mold undercuts, thin walls (`min_wall_mm`
1, fail), thick sections (`max_wall_mm` 4, warn), internal corners under
`min_radius_mm` 0.5 (warn). dfm_review adds a uniformity warning when the
thickest / thinnest wall exceeds `max_wall_ratio` (2.5). A script's `dfmSpec`
moulding settings are the defaults; call options win.

## Reproduce

```sh
npx tsx docs/demos/dfm-sheetmetal-molding/report.ts        # -> result.json
npm run build:player                                        # once, for render
kernelcad render inspect docs/demos/dfm-sheetmetal-molding/<part>.kcad.ts <render-dir>/<part>   # each of the 4 parts
python3 -I docs/demos/dfm-sheetmetal-molding/compose.py <render-dir> <out-dir>                  # -> <out-dir>/demo.mp4
```

The renders came from the bundled headless player in a local headless Chrome
(software GL). This is local validation of the kernel and the MCP tool
handler on one machine; it does not show the hosted service, a mold flow or
press-brake simulation, or a molded or bent part.
