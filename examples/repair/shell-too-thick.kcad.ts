// DELIBERATELY BROKEN — repair fixture for `examples/repair/run-repair-example.ts`.
//
// An 8 mm wall on a 10 mm cube exceeds half the thinnest dimension.
// OCCT cannot hollow it and emits `feature.kernel-failed` (error).
//
// The steer message does not propose a thinner wall automatically: compare the
// requested wall with the thinnest local feature, or author an explicit hollow
// (outer.subtract(inner.translate(wall, wall, wall))) for an origin-based box).
//
// Run the repair walkthrough:
//   npx tsx examples/repair/run-repair-example.ts examples/repair/shell-too-thick.kcad.ts
return box(10, 10, 10).shell(8, { face: 'top' });
