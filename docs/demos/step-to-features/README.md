# STEP to editable feature tree demo

`mesh_to_features` (CLI `kernelcad reconstruct`) now accepts a `.step`/`.stp`
file. It reads one solid with the OCCT STEP reader and tessellates that exact
B-rep finely. It then runs the existing fit → emit → evaluate → compare loop
and returns an editable `.kcad.ts` with named params, plus a measured fidelity
verdict.

## Reproduce

From the repository root, with dependencies installed, `npm run build:player`
done once, Chromium available (or `PW_CDP_URL` pointing at a running Chrome),
Python 3 with Pillow and ffmpeg:

```bash
bash docs/demos/step-to-features/capture.sh
```

## Retained source and result

- `original.kcad.ts` authors the plate (80 × 50 × 10 mm, R5 vertical-edge
  fillets, 4 × Ø6.6 through holes). It is exported to `source.step`, and the
  rebuild sees only that STEP file.
- `rebuilt.kcad.ts` and `rebuilt.ledger.json` are the unedited tool output.
  `verification/reconstruct.json` is the full `--json` result: verdict
  `faithful`, volume IoU 1.0000, max deviation 0.000 mm against the STEP
  tessellated at 0.019 mm (5068 triangles), 4 × Ø6.6 through holes, R5 × 4
  fillets, params `length`, `width`, `thickness`, `holes1Diameter`,
  `filletRadius`.
- `edited.kcad.ts` is `rebuilt.kcad.ts` with three param defaults changed by
  hand (length 110, hole Ø10, fillet R12), to show the result is editable.
- `source-view.kcad.ts` only renders `source.step` through `lib.fromSTEP`.
- `demo.mp4` (16 s, 1280 × 720) is composed by `render_demo.py` from the
  three publish renders. Every number on screen is read from
  `verification/reconstruct.json`. `verification/frame-*.png` are the
  inspected slides.

## Scope

This is a local CLI run and a geometric comparison against the STEP's own
tessellation. It is not a physical part test and not a comparison against
another CAD system's feature tree. The rebuild covers what `mesh_to_features`
covers: extruded or revolved profiles, drilled/counterbored holes,
constant-radius fillets, pockets. Other geometry is reported as
`unmatchedRegions`, or the part is refused (for example a toothed GT2 pulley
STEP returns `reference.mesh.not-a-single-profile`). Multi-solid files need
`solid` (`--solid`) to pick one body.
