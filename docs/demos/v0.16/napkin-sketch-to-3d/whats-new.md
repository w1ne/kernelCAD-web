# v0.16 — drawing PDF to an editable part

## Hero artifact

napkin-sketch-to-3d — a 70 × 50 × 45 mm motor-mount L-bracket rebuilt from
its third-angle engineering drawing: stated dimensions, two Ø5.5 through
holes and one Ø12 clearance, 5 mm wall. The script is the `drawing_to_cad`
output (`examples/drawing-to-cad/motor-mount-bracket.kcad.ts`); fidelity
against the sheet is match on hole diameters and view silhouettes.

## Why memorable

- Recognizable in one second: an L-bracket with a bolt pattern, not a box.
- New tool central: `drawing_to_cad` reads vector linework and dimension
  text from a PDF with no vision model, then emits editable `.kcad.ts`
  plus an assumption ledger.
- Reads at 360°: the rebuilt solid is the same part from every view; the
  drawing's front / top / left silhouettes match.

## What's new

The hero clip is two beats: the third-angle sheet (`drawing_to_cad` reads
linework and stated dimensions), then the same motor-mount rebuilt as
parametric CAD. v0.16 also ships auto GD&T, FEA, G-code, mesh-to-features,
and cookbook hardware recipes. Full notes in `CHANGELOG.md`.

![Demo](./demo.mp4)
![Panel](./panel.png)
