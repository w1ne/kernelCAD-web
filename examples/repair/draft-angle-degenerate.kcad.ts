// DELIBERATELY BROKEN — repair fixture for `examples/repair/run-repair-example.ts`.
//
// A 90° draft on a box face is geometrically degenerate. Lowering emits
// `feature.draft.failed` (error) and returns the undrafted solid.
//
// The repair loop offers a mould-release ladder under 15°, largest first (8°).
//
// Run the repair walkthrough:
//   npx tsx examples/repair/run-repair-example.ts examples/repair/draft-angle-degenerate.kcad.ts
return box(10, 10, 10).draft(90, { face: 'front' });
