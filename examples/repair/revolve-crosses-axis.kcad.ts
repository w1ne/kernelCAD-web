// DELIBERATELY BROKEN — repair fixture for `examples/repair/run-repair-example.ts`.
//
// A washer profile whose inner x sits at -1 mm, so the path crosses the
// revolve axis. Lowering emits `feature.revolve.crosses-axis` (error).
//
// The repair loop clamps every negative path x-coordinate to 0.
//
// Run the repair walkthrough:
//   npx tsx examples/repair/run-repair-example.ts examples/repair/revolve-crosses-axis.kcad.ts
return path()
  .moveTo(-1, 0)
  .lineTo(10, 0)
  .lineTo(10, 5)
  .lineTo(-1, 5)
  .close()
  .revolve();
