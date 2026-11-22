# Drawing path verification — real PDF, seeded cubic defect

KernelCAD's drawing QA must not ignore paths which are not straight M/L
polylines or paths positioned with parent transforms.

This local test first exports an actual 80 × 50 × 12 mm OCCT fixture sheet.
It then **injects one synthetic cubic path** into the front view, with a
control/endpoint outside the A4 page. This does not represent the generated
source geometry. The fault is intentional, to prove the QA detector.

The serialized SVG parser now shares the vector PDF writer's path grammar.
Cubic extrema are computed from the curve itself after SVG affine transforms,
rather than by checking only M/L points or blindly bounding control points.
Unknown path commands cannot produce a false `verified` result.

Artifacts: [bad injected PDF](before.pdf), [original PDF](after.pdf), their
[bad](before.png) and [original](after.png) Poppler rasterizations, the
[8-second comparison video](demo.mp4), [structured evidence](result.json),
and [reproduction source](demo.ts). The bad artifact reports `view-overflow`.
The original artifact has no view overflow; its engineering requirements
remain undeclared, so it is not manufacturing certified.

Run from repository root:

    npx tsx docs/demos/drawing-path-qa/demo.ts
    npx vitest run src/kernel/backends/occt/drawingSvgPathBounds.test.ts src/kernel/backends/occt/drawingVisualQa.review.test.ts

This is local deterministic geometry QA, not a vision-model audit or a
fabricated hardware acceptance test.
