# Drawing-sheet geometric preflight (local demonstration)

An actual four-view A4 SVG drawing of an OCCT fixture plate passes view-box
placement checks. A separate, explicitly **synthetic** displaced-view test
detects a view leaving the frame and overlapping the title block.

The eight-second [MP4](demo.mp4) shows the actual exported drawing alongside
the two preflight results. Both scenes use the same real drawing; scene two
changes only the test input geometry for the preflight report and is **not** a
second exported drawing. [Original SVG](actual-drawing.svg), [machine-readable
result](result.json), and [capture source](demo.ts) are preserved.

The checks cover projected view bounding boxes, not text glyphs, annotations,
PDF pagination, GD&T completeness, fits, or manufacturing readiness. Warnings
do not block the drawing export. This is local validation, not evidence of
deployment or physical manufacturing.

Reproduce from the repository root:

    npx tsx docs/demos/drawing-sheet-preflight/demo.ts
    npx vitest run src/kernel/backends/occt/drawingSheetPreflight.test.ts
