# Project an open curve onto one face

`Shape.projectCurve` has a closed mode that returns a face-bound `Sketch` and an open mode that returns `Curve3D[]`. Open mode uses OCCT's directed projection onto one selected face and keeps every edge it returns, including separate fragments where a face boundary or hole splits the path.

```typescript
const mm = (n: number) => ({ expression: String(n), unit: 'mm' as const, evaluated: n });
const curves = await body.projectCurve({
  source: { kind: 'sketchCommands', commands: [
    { kind: 'moveTo', x: mm(-12), y: mm(0) },
    { kind: 'lineTo', x: mm(12), y: mm(0) },
  ] },
  face: 'top',
  asEdge: true,
  sourcePlane: { origin: [0, 0, 50], normal: [0, 0, 1], xAxis: [1, 0, 0] },
  direction: [0, 0, -1],
});
```

The source path is one open command chain: one `moveTo`, at least one segment, no `close`, and no second `moveTo`. `sourcePlane.origin` is in millimetres in world coordinates; `normal` and `xAxis` define its frame. `direction` is a non-zero world-space vector. The selected face must resolve to exactly one B-rep face. A path that misses the face raises `feature.project-curve.no-intersection`.

When a 24 mm line crosses a centered 6 mm through-hole, open mode returns two 9 mm `Curve3D` fragments. Each fragment supports the usual curve queries. A `Curve3D` can also be a `variableSweep` spine when its profile is perpendicular to the spine tangent; the executable bundle checks a Z-aligned side-face projection as that downstream case. Closed mode remains synchronous and returns a `Sketch`; open mode must be awaited because it lowers the source and target geometry to capture the resulting curves.

The [demo bundle](../demos/open-face-projection/README.md) contains the executable repro, measured geometry, narrow test result, and MP4. The demo shows local OCCT geometry validation; it does not claim deployed behavior or hardware acceptance.
