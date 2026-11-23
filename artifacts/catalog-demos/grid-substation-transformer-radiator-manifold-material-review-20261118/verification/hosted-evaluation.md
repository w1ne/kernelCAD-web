# Hosted kernelCAD evaluation — 18 November 2026

The post-change and saved pre-change source were both sent inline to the hosted `evaluate_script` tool. Both builds produced the same `mechanism.interpenetration` errors:

- `radiator-fin-1` with `inlet-manifold`
- `radiator-fin-6` with `outlet-manifold`

The evaluator returned `buildOk: true` and `ok: false` for both versions. These overlaps predate the color edit; this round did not alter geometry and does not claim the model passes the hosted interference check. The evaluator also could not create step snapshots because the hosted session had no browser attachment. The repository's local software renderer and exported-GLB regression are the evidence for the appearance correction. This review does not claim simulation or hardware acceptance.
