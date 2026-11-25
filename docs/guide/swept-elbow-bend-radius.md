# Sweep a pipe elbow with a declared bend radius

`Sketch.sweep` accepts `bendRadius` on a polyline rail. The option replaces
every interior corner with a tangent arc of that centreline radius before the
sweep. The spine is exact line-and-arc geometry, so a closed profile sews into
one solid instead of the unsewn shell that `transitionMode: 'round'` can leave
for a curved profile.

```ts
// 90° circular elbow: 30 mm legs, 6 mm centreline bend radius, Ø8 tube.
return path().circle(0, 0, 4).sweep(
  [[0, 0, 0], [30, 0, 0], [30, 30, 0]],
  { bendRadius: 6 },
);
```

The sweep path is the two straights minus the tangent length at each corner,
plus the arc:

```
cut length = (30 - 6) + (30 - 6) + 6·π/2 = 57.4248 mm
volume     = π·4² × 57.4248       = 2886.484 mm³
```

Use `bendRadius` instead of `transitionMode: 'round'` when the profile is round
or otherwise curved. A round corner on a sharp polyline is refused with
`feature.sweep.invalid-result` because OCCT does not sew its tangent-arc faces
to the straight runs for those profiles.

## Contract

- `bendRadius` is a positive finite centreline radius in mm; a numeric
  `param()` reference is accepted and resolves at build time.
- It requires the default `spine: 'polyline'` and the default
  `transitionMode: 'right'`. A smooth or helix spine has no polyline corner to
  replace, and a non-`right` transition would add a second corner treatment.
- A leg too short for the tangent points at its ends fails with
  `feature.invalid-args` naming the leg and the missing length. Reduce
  `bendRadius` or lengthen the leg.
- Omitting `bendRadius` keeps the existing sharp-corner behaviour unchanged.

## Verification

The regression suite
[`tests/integration/modeling/sweepBendRadius1785.test.ts`](../../tests/integration/modeling/sweepBendRadius1785.test.ts)
builds the elbow above and checks one solid, solid-level BRepCheck validity,
the analytic volume within 0.5 %, the bounding box, a non-circular profile, the
unchanged sharp-corner path, the invalid-option refusals, and a STEP export.
These are local OCCT measurements, not deployed or hardware acceptance.
