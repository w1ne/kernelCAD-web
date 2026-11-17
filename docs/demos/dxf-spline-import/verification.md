# DXF SPLINE import verification

## Regression reproduction

Before implementation, the end-to-end rational-spline fixture failed at
`lib.fromDXF` because the importer rejected `SPLINE` as unsupported. The
diagnostic named line 19 and stated that sketch lowering had no 2D NURBS
segment. This established the gap before the importer was changed.

The regression tests now assert the retained degree, knot vector and rational
weights, then extrude the imported profile through the normal sketch and OCCT
path. They check topology validity and compare volume with the analytic
quarter-cylinder volume. Parser tests also verify winding normalization and
explicit rejection of periodic splines.

The two focused suites passed all 42 tests; the complete output is retained in
[`import-tests.log`](import-tests.log). For the behavior-removal check, the
`SPLINE` dispatch was temporarily switched back to the old unsupported-entity
path. The end-to-end regression then failed at `lib.fromDXF` with the expected
line-19 unsupported-SPLINE diagnostic; the output is retained in
[`behavior-removed-test.log`](behavior-removed-test.log). The implementation
was restored before final verification.

## Demo verification

`verification.json` records the example and DXF hashes, the imported NURBS
data, the local OCCT validity result, measured volume and bounds, and ffprobe
metadata for the generated MP4. The source and result review frames were
extracted from the MP4 and visually inspected.

The importer accepts clamped, continuous, non-periodic planar control-point
splines with optional positive rational weights. Fit-point-only, periodic,
nonplanar and discontinuous forms remain explicit errors.

Local replay and regression tests do not establish deployed behavior,
simulation, or hardware acceptance.
