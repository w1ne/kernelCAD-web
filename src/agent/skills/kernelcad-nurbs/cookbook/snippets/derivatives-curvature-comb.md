# Build a curvature-matched G2 bridge between two panel curves

For a Class-A surface bridge between two adjacent panels, the join must be G2-continuous — matching position, tangent, AND curvature on both sides. `derivatives(t, 2)` measures all three at any point on a curve.

```ts
const leftPanel = spline3d([
  [-80, 0, 20], [-60, 5, 18], [-40, 12, 15], [-20, 18, 10],
]);

const rightPanel = spline3d([
  [20, 18, 10], [40, 12, 15], [60, 5, 18], [80, 0, 20],
]);

// Measure end-of-left and start-of-right derivatives up to order 2.
const leftEnd = leftPanel.analytics.derivatives(1, 2);
const rightStart = rightPanel.analytics.derivatives(0, 2);

// Index 0: point. Index 1: tangent vector (unnormalised). Index 2: curvature vector.
const bridge = hermiteG2(
  { point: leftEnd[0], tangent: leftEnd[1], curvature: leftEnd[2] },
  { point: rightStart[0], tangent: rightStart[1], curvature: rightStart[2] },
);

const section = path()
  .moveTo(-2, -2).lineTo(2, -2).lineTo(2, 2).lineTo(-2, 2).close();
return variableSweep(bridge, [
  { t: 0, profile: section },
  { t: 1, profile: section },
]);
```

The resulting `bridge` is a degree-5 NURBS curve guaranteed G2-continuous with both panels. The same pattern drives:

- Curvature combs for visual continuity audits (sample `derivatives(t, 2)` at N points; plot the curvature-vector magnitudes).
- Radius-of-curvature reports (`1 / Math.hypot(...curvature)` at any `t`).
- Inflection-point detection (find where the curvature vector crosses zero).

`numDerivs` must not exceed the curve degree — derivatives beyond `degree` are zero by construction, and the call throws `feature.curve3d.analytics.derivatives-out-of-range` to surface the input mistake.
