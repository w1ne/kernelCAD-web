// DELIBERATELY BROKEN — repair fixture for `examples/repair/run-repair-example.ts`.
//
// Two circles (r=10 at the origin, r=4 at x=30) and a tangent circle of
// radius 1 mm. No externally-tangent circle that small exists: the floor
// is (30 - 10 - 4) / 2 = 8 mm. Lowering emits `sketch.tangency.no-solution`.
//
// The repair loop measures the centre distance and raises `opts.radius`
// to that floor. (Parallel *lines* are a documented OCCT Circ2d2TanRad
// dead end at every radius; this derivation is the circle-circle case
// the solver can actually satisfy.)
//
// Run the repair walkthrough:
//   npx tsx examples/repair/run-repair-example.ts examples/repair/tangency-radius-too-small.kcad.ts
return path().tangentCircle(
  [{ kind: 'circle', center: [0, 0], radius: 10 },
   { kind: 'circle', center: [30, 0], radius: 4 }],
  { radius: 1 },
).extrude(10);
