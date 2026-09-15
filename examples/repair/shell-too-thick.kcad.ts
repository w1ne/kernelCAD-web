// DELIBERATELY BROKEN — repair fixture for `examples/repair/run-repair-example.ts`.
//
// An 8 mm wall on a 10 mm cube exceeds half the thinnest dimension.
// OCCT cannot hollow it and emits `feature.kernel-failed` (error).
//
// The repair loop reads the bbox and proposes thicknesses under the 5 mm
// ceiling, largest first (0.4 × 10 mm = 4 mm).
//
// Run the repair walkthrough:
//   npx tsx examples/repair/run-repair-example.ts examples/repair/shell-too-thick.kcad.ts
return box(10, 10, 10).shell(8, { face: 'top' });
