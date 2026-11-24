# Closed shell (sealed hollow body)

[Watch the turntable](demo.mp4) · [Poster](poster.png)

The demo hollows a 60 × 40 × 30 mm block to a 3 mm wall with
`shell(3, { closed: true })`. Every outer face stays in place, so the result
is one solid with a sealed internal cavity. The script then cuts the part in
half at `y = 20` only to expose that cavity in the render. The uncut shell
measures 27936 mm³, exactly the 72000 mm³ outer block minus the
54 × 34 × 24 mm cavity. The measured B-rep is valid, has no diagnostics, and
keeps 12 faces on the sealed shell (6 outer + 6 inner).

This is local worktree validation on the OCCT backend. It is not deployed
behavior, and it is not a claim about another CAD system.

## Reproduce

From the repository root, after `npm ci` and `npm run build:cli`:

```sh
node dist/cli/index.js evaluate docs/demos/closed-shell/closed-shell.kcad.ts --json
npx tsx docs/demos/closed-shell/measure.mts
node dist/cli/index.js animate docs/demos/closed-shell/closed-shell.kcad.ts \
  docs/demos/closed-shell/demo.mp4 --turntable \
  --width 960 --height 720 --duration-ms 6000 --elevation 22 --preset default
ffmpeg -y -ss 3.0 -i docs/demos/closed-shell/demo.mp4 \
  -frames:v 1 docs/demos/closed-shell/poster.png
```

`demo.mp4` is H.264, 960 × 720, 30 fps, 180 frames, 6.0 s. The poster is a
frame from the same capture at 3.0 s, when the cut face shows the enclosed
cavity and the 3 mm section.

## Measured result

| Check | Sealed shell | Cutaway |
|---|---|---|
| Evaluation | `ok: true`, 0 diagnostics | `ok: true`, 0 diagnostics |
| Volume | 27936 mm³ | 13968 mm³ |
| Surface area | 18696 mm² | 9852 mm² |
| Faces | 12 (6 outer + 6 inner) | 11 |
| Bounding box | 60 × 40 × 30 mm | 60 × 20 × 30 mm |

The expected sealed volume is `60·40·30 − 54·34·24 = 27936 mm³`; the cutaway
is exactly half of that. The cavity has no opening, so the inner skin is
present on all six sides.

## Bundle contents

- `closed-shell.kcad.ts` — the design source of truth.
- `measure.mts` — measures the sealed shell and the cutaway.
- `poster.png` — still frame inspected visually.
- `demo.mp4` — inspected turntable deliverable.
- `verification.json` — invocation, measured values, hashes and media details.
