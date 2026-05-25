# Trim a fender curve at its intersection with a wheel-arch curve

Find where two design curves cross, then use the intersection parameter to trim or split downstream.

```ts
const fenderTop = spline3d([
  [-100, 0, 60], [-50, 0, 75], [0, 0, 80], [50, 0, 75], [100, 0, 60],
]);

const wheelArchRadius = 35;
const wheelCenter: [number, number, number] = [30, 0, 60];
const wheelArch = spline3d([
  [wheelCenter[0] - wheelArchRadius, 0, wheelCenter[2]],
  [wheelCenter[0], 0, wheelCenter[2] + wheelArchRadius],
  [wheelCenter[0] + wheelArchRadius, 0, wheelCenter[2]],
]);

const crossings = fenderTop.analytics.intersect(wheelArch, { tolerance: 1e-3 });
if (crossings.length === 0) {
  throw new Error(
    'Expected the fender top to cross the wheel arch; got no intersection. Verify the input geometry.',
  );
}

const [{ tA: trimAt, ptA: trimPoint }] = crossings;

// trimAt is the parameter on fenderTop where the wheel arch intersects;
// trimPoint is the world-space crossing point. Use either downstream for
// a split-curve op, a sketch anchor, or a connector-frame origin.
return box(6, 6, 6).translate(trimPoint[0], trimPoint[1], trimPoint[2]);
```

When the curves do not cross within tolerance, `intersect` returns an empty array. When they cross at multiple points (e.g. an S-curve weaving across a straight edge), every crossing appears in the result; iterate `crossings` and pick by the parameter you care about.

The receiver matters: `a.analytics.intersect(b)` puts `tA` on `a` and `tB` on `b`. The swap-form `b.analytics.intersect(a)` returns the same crossings with `tA` / `tB` swapped.

For curve-surface intersection use the same instance method with a `Surface` operand: `curve.analytics.intersect(surface)` returns `CurveSurfaceIntersection[]` whose records carry `tCurve`, `uv`, and `pt`.
