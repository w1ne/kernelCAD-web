# KernelCAD visual drawing QA — real PDF correction

This reproducible local experiment tests the **canonical** `visualQa` workflow
using the generic `runAndExport` API. The source is an 80 × 50 × 12 mm block
with one authored inspection note. It does not include declared critical
engineering dimensions, so `visualQa.status` correctly remains `incomplete`
even after all measured layout defects disappear.

On A4, the actual PDF clips the inspection text and the serialized SVG QA
reports `text-clipping`. With
`visualQa: { autoRepair: true, maxAttempts: 3 }`, the exporter retries on A3,
retains the improvement, and **reads back the vector PDF**. The final result
has no layout error and `pdf.status: passed`; engineering completeness and
manufacturability are not certified.

The real outputs are [A4 before](before.pdf) and [A3 after](after.pdf).
They are independently rasterized by Poppler to [before.png](before.png) and
[after.png](after.png). The [eight-second MP4](demo.mp4) shows those actual
raster files, not a fabricated visual reconstruction. [result.json](result.json)
records the attempted repair, final PDF readback and diagnostics.
[demo.ts](demo.ts) regenerates all artifacts.

This run does not prove every dimension, view, material, tolerance, or
supplier specification. Source geometry and the annotation text remain
unchanged during the sheet-size repair. It is local software verification,
not deployed production or physical engineering acceptance.

Reproduce from the repository root:

    npx tsx docs/demos/drawing-visual-qa/demo.ts
    npx vitest run src/kernel/backends/occt/drawingVisualQa.review.test.ts src/agent/script-runtime/exportDrawing.visualQa.test.ts
