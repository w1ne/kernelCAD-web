# Blind-hole drill points

[Watch the turntable](demo.mp4) · [Poster](poster.png)

The demo cuts a 60 × 40 × 16 mm plate in half at `y = 20`, then drills three
Ø8 blind holes at depths 6, 9 and 12 mm with `drillPoint: true`. The bores sit
on the cut face, so half of each 118° cone is visible. The measured solid has
one body, no diagnostics, and stays a valid B-rep.

This is local worktree validation on the OCCT backend. It is not deployed
behavior, and it is not a claim about another CAD system.

## Reproduce

From the repository root, after `npm ci` and `npm run build:cli`:

```sh
node dist/cli/index.js evaluate docs/demos/hole-drill-point/hole-drill-point.kcad.ts --json
npx tsx docs/demos/hole-drill-point/measure.mts
node dist/cli/index.js animate docs/demos/hole-drill-point/hole-drill-point.kcad.ts \
  docs/demos/hole-drill-point/demo.mp4 --turntable \
  --width 960 --height 720 --duration-ms 6000 --elevation 22 --preset default
ffmpeg -y -ss 4.5 -i docs/demos/hole-drill-point/demo.mp4 \
  -frames:v 1 docs/demos/hole-drill-point/poster.png
```

`demo.mp4` is H.264, 960 × 720, 30 fps, 180 frames, 6.0 s. The poster is a
frame from the same capture at 4.5 s, when the cut face and all three cones are
visible.

## Measured result

| Check | Value |
|---|---|
| Evaluation | `ok: true`, 0 diagnostics, 6 features |
| Volume | 18407.35 mm³ |
| Surface area | 5080.74 mm² |
| Bounding box | min (0, 20, 0), max (60, 40, 16) mm |
| Cutaway | `y >= 20` half of a 60 × 40 × 16 plate |
| Holes | Ø8 × 6, Ø8 × 9, Ø8 × 12 mm, 118° drill point |

The cone tip extends below the full-diameter depth by
`radius / tan(118° / 2)`, so each apex is about 2.40 mm below its shoulder.

## Bundle contents

- `hole-drill-point.kcad.ts` — the design source of truth.
- `measure.mts` — measures the evaluated solid.
- `poster.png` — still frame inspected visually.
- `demo.mp4` — inspected turntable deliverable.
- `verification.json` — invocation, measured values, hashes and media details.
