# Snap a connector to the nearest point on a chassis rail

When mating a servo bracket onto a curved chassis rail, the load-bearing question is "where on the rail is closest to the bracket's mounting point?" `Curve3D.analytics.closestPoint` answers this in one call, exact within solver tolerance.

```ts
const rail = spline3d([
  [0, 0, 0],
  [50, 10, 0],
  [100, 5, 0],
  [150, -5, 0],
  [200, 0, 0],
]);

const bracketAnchor: [number, number, number] = [120, 30, 0];

const snapPoint = rail.analytics.closestPoint(bracketAnchor);
const snapT = rail.analytics.closestParam(bracketAnchor);
const railTangent = rail.tangentAt(snapT);

// Mount the bracket with origin on the rail, axis along the rail tangent.
const bracketFrame = {
  origin: snapPoint,
  axis: railTangent,
};

return box(8, 8, 4).translate(bracketFrame.origin[0], bracketFrame.origin[1], bracketFrame.origin[2]);
```

The returned `snapPoint` is exact to solver tolerance (default 1e-3 mm). The returned `snapT` is on `[0, 1]`; pass it to `pointAt(t)` or `tangentAt(t)` for further sampling.

For curves with self-proximity (S-shapes, near-tangent loops), `closestPoint` returns the local minimum near the seed. If the query is ambiguous, tessellate first and pick the closest polyline vertex as a coarse pre-seed.
