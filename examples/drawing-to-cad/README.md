# Drawing PDF to an editable part

`drawing_to_cad` reads a vector engineering-drawing PDF and writes an editable
`.kcad.ts` plus an assumption ledger saying where every value came from. No
vision model is involved: the linework, line weights, dash patterns and the
dimension text are read straight out of the PDF.

## Files

- `motor-mount-bracket.pdf` — the input: a third-angle A4 sheet with front,
  top and left views, dimensions, two hole callouts and a title block. It was
  drawn by kernelCAD's own `svg-drawing` exporter from the source model in
  `tests/helpers/drawingPdf/fixtureModels.ts` (`MOTOR_MOUNT_BRACKET`) and
  converted to PDF (`npx tsx tests/helpers/drawingPdf/generateFixtures.ts`).
- `run-drawing-to-cad.ts` — calls the `drawing_to_cad` MCP tool with
  `{ path, out }` and prints what it read.
- `motor-mount-bracket.kcad.ts` — the emitted script (written by the run).
- `motor-mount-bracket.ledger.json` — the emitted ledger (written by the run).

## Run

```bash
npx tsx examples/drawing-to-cad/run-drawing-to-cad.ts
```

## Expected output

```
ok: true
sheet: scale 1:1 (title-block), mm, third-angle
views: front (alignment), top (alignment), left (alignment)
build: extrude of the front view along Y, 3 hole(s), extents 70 x 50 x 45 mm
params: width=70, leftThickness=5, hole1X=45, depth=50, hole1Y=12, height=45, bottomThickness=5, hole3Z=27, holeDia1=5.5, holeDia2=12
fidelity: match — holes 5.5, 5.5, 12 mm; silhouette IoU front 1, top 1, left 1
ledger: 16 facts, 2 open
  confirmed visible  units: Units 'mm' read from the title block.
  confirmed visible  scale: Sheet scale 1:1 read from the title block.
  confirmed visible  projection: Projection third-angle, read from the title block projection symbol.
  confirmed visible  views: Views front, top, left identified by projection alignment; 1 pictorial view(s) ignored.
  confirmed visible  width: X span of 70 mm stated by dimension '70' (front view).
  confirmed visible  leftThickness: X span of 5 mm stated by dimension '5' (front view).
  confirmed visible  hole1X: X span of 45 mm stated by dimension '45' (top view).
  confirmed visible  depth: Y span of 50 mm stated by dimension '50' (top view).
  confirmed visible  hole1Y: Y span of 12 mm stated by dimension '12' (top view).
  open      inferred symmetry:hole3Y: Y = 25 mm: centred on the part (symmetry about the stated extent; no dimension locates it).
  open      inferred symmetry:hole2Y: Y = 38 mm: mirror image of a dimensioned position about the part centre (symmetry; no dimension locates it).
  confirmed visible  height: Z span of 45 mm stated by dimension '45' (front view).
  confirmed visible  bottomThickness: Z span of 5 mm stated by dimension '5' (front view).
  confirmed visible  hole3Z: Z span of 27 mm stated by dimension '27' (left view).
  confirmed visible  holeDia1: Hole diameter 5.5 mm stated by callout '2× ⌀5.5 THRU' (top view).
  confirmed visible  holeDia2: Hole diameter 12 mm stated by callout '⌀12 THRU' (left view).
diagnostic: warn reference.assumptions.unresolved
wrote examples/drawing-to-cad/motor-mount-bracket.kcad.ts
wrote examples/drawing-to-cad/motor-mount-bracket.ledger.json
```

What to read in it:

- The L profile comes from the front view (the only view whose silhouette is
  not a rectangle); the 50 mm depth comes from the top view.
- The wall hole is drawn as a circle in the left view, so it is cut along X.
  The base holes are cut along Z through the 5 mm base, the span their hidden
  lines show in the front view.
- Only one base hole's Y position is dimensioned. The second one, and the wall
  hole's Y, are placed by symmetry: the script writes them as
  `depth.subtract(hole1Y)` and `depth.divide(2)`, so they follow `depth` and
  `hole1Y`. Those two `symmetry:` facts are `inferred` and stay open. Confirm
  them, or edit the expression in the script if the part is not symmetric:

  ```text
  resolve_assumptions({ ledgerPath: 'examples/drawing-to-cad/motor-mount-bracket.ledger.json',
                        resolutions: [{ id: 'symmetry:hole2Y', confirm: true }, { id: 'symmetry:hole3Y', confirm: true }] })
  ```

- Facts whose id is a param name (`width`, `hole1Y`, `holeDia2`, …) are the
  ones to override with a value; feed the returned `paramOverrides` to
  `set_param`.

## Verify the script builds

```bash
npx kernelcad evaluate examples/drawing-to-cad/motor-mount-bracket.kcad.ts
```

Expected:

```
Features: 8
OK
```
