# Rendered-PDF drawing QA and bounded layout repair

Actual manufacturing-drawing export workflow using the public `runAndExport`
API. The source builds a small 80 × 50 × 12 mm fixture block with a long
inspection note. With an explicit A4 page and no repair, the note clips past
the paper edge; `drawing_report.renderedText` reports that exact defect.
With `layoutRepair: true`, the exporter tries the next standard sheet (A3)
and retains it because the issue count falls to zero. Source geometry and
annotation text do not change. This is a **local software verification**, not
physical engineering acceptance or a production deployment.

The two resulting **vector PDFs** are [A4 before](before.pdf) and
[A3 after](after.pdf). Both were rasterized with Poppler `pdftoppm` to the
[before](before.png) and [after](after.png) PNG files. The [eight-second
MP4](demo.mp4) shows both real PDF rasters. The [machine-readable result](result.json)
records sheet sizes, dimensions, diagnostics and attempted repairs; the
[capture script](demo.ts) reruns the exact export and video.

The text inspector computes transformed bounding rectangles from the finished
serialized SVG using the PDF writer's parser and Helvetica advances. It checks
page clipping, reserved cells, captions, and annotation label collisions. The
real raster is independently inspected in this demo, **not** by an always-on
pixel or OCR service. This does not prove complete GD&T coverage, every
annotation leader, physical fit, or manufacturability.

Reproduce from repository root:

    npx tsx docs/demos/drawing-sheet-qa/demo.ts
    npx vitest run src/kernel/export/pdf/drawingTextReview.test.ts src/kernel/backends/occt/exportSvgDrawing.test.ts tests/integration/drawing/pdfDrawingExport.test.ts
