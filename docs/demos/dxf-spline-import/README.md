# DXF SPLINE import demo bundle

This bundle records a local `lib.fromDXF` workflow using the fixture and
example in [examples/interoperability/dxf-spline](../../../examples/interoperability/dxf-spline/).

- [MP4 demo](demo.mp4) — 1280 × 720, 12 fps, about 8 seconds.
- [Capture source](capture.mts) — evaluates the example with local OCCT, meshes
  its feature history, software-renders those actual triangles, and encodes the
  video without opening a browser.
- [Verification record](verification.json) — source hashes, exact NURBS command,
  local B-rep validity, measured volume and bounds, video settings and probe data.
- [Regression verification](verification.md) — focused passing tests and the
  expected failure when SPLINE support is temporarily removed.
- [Inspected source frame](review-frame-source.png) and
  [result frame](review-frame-result.png) — frames extracted from the MP4.
- [Cookbook handoff](../../../cookbook/snippets/import-dxf-spline-profile.md)
  documents the native API and supported spline subset.

Reproduce from the repository root:

```sh
timeout 180s npx tsx docs/demos/dxf-spline-import/capture.mts
```

The fixture is an exact rational quadratic quarter circle of radius 10 mm,
closed by two lines and extruded 3 mm. The local OCCT result is valid and has
volume `235.6194490185 mm³`; the analytic quarter-cylinder volume is
`235.6194490192 mm³`. See [verification notes](verification.md) for regression
test evidence.

The video records local script replay and geometry validation only. It does
not establish deployed behavior, simulation results, or hardware acceptance.
