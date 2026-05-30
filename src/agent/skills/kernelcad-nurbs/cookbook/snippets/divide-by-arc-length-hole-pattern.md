# Lay out 8 ventilation slots evenly along a curved enclosure edge

Place N features uniformly spaced in arc length (not parametrically) along a freeform curve. `divideByEqualArcLength(n)` returns `n + 1` samples spaced equally in millimetres along the curve.

```ts
const topEdge = spline3d([
  [-60, 30, 25],
  [-30, 33, 25],
  [0, 35, 25],
  [30, 33, 25],
  [60, 30, 25],
]);

const slotPositions = topEdge.analytics.divideByEqualArcLength(8);

let enclosure = box(120, 70, 50);
for (const { pt } of slotPositions) {
  const slot = box(3, 8, 4).translate(pt[0], pt[1], pt[2]);
  enclosure = enclosure.subtract(slot);
}
return enclosure;
```

`.sample(n)` returns `n + 1` parametric samples — for non-uniform-knot curves (every fit-through-points spline, every Catmull-Rom), these are clustered where the knot density is high, producing visibly uneven hole spacing on the part. `.divideByEqualArcLength(n)` returns `n + 1` samples that are uniformly spaced in millimetres along the curve. Pick the arc-length form whenever the design intent is "evenly placed along the curve."

For a fixed-pitch layout ("a slot every 12 mm"), use `divideByArcLength` instead:

```ts
const slotPositions = topEdge.analytics.divideByArcLength(12);
```

This returns however many samples fit; the last sample lands at the curve end if the total length is not an integer multiple of the pitch.
