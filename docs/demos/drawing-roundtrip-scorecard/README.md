# Drawing round-trip scorecard demo

`npm run drawing-roundtrip:scorecard` draws each of the 27 reference parts
(`assets/reference-parts/scorecard.json`) with kernelCAD's `pdf-drawing`
exporter. That sheet is auto-dimensioned, A3, third angle, with datum and
tolerance frames. The script then reads the PDF back with `drawing_to_cad`,
rebuilds the emitted script, and compares it with the analytic volume and bbox.
A part passes at ±0.1 % volume (a mass check) and 0.05 mm per extent.

## Reproduce

```bash
bash docs/demos/drawing-roundtrip-scorecard/capture.sh
```

## Retained evidence

- `verification/before.{md,json}`: the scorecard with this change's reader
  fixes reverted (`develop` at `c6bdd59`). **0/27 pass.** The reader merged
  datum boxes and tolerance frames into the views, so views never aligned
  and most sheets were read as a single plan view.
- `verification/after.{md,json}`: the same run with the fixes. **15/27 pass,**
  10 wrong, 1 refused (sphere), and 1 export error. That error is the
  mirrored-block reference part: its two separate bodies are refused by the
  drawing exporter.
- `stepped-shaft.pdf` and `verification/stepped-shaft-sheet.png`: one input
  sheet. It dimensions only Ø16 and 20. The Ø8 step and its 10 mm length are
  measured from the linework and recorded as inferred ledger facts.
- `demo.mp4` (15 s, 1280 × 720) is composed by `render_demo.py`. Every number
  in it is read from the two JSON files. `verification/frame-*.png` are the
  inspected slides.

## Scope

These are clean vector sheets that kernelCAD drew itself, so the score is an
upper bound for third-party drawings. It is not a test on public practice
drawings, which are mostly raster images; `drawing_to_cad` refuses raster
pages. The remaining failures are things the reader does not model: fillets,
chamfers, slots, shells, lofts, tori and multi-body patterns. Callouts are
also split because the PDF writer draws the ▾ depth and ⌴ counterbore symbols
as shapes, so the counterbore plate still fails.
