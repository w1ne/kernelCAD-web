// DELIBERATELY BROKEN — repair fixture for `examples/repair/run-repair-example.ts`.
//
// A 60 x 40 x 6 mm plate with one mounting hole. `u` / `v` are measured from
// the centre of the top face, so on a 60 mm plate any |u| beyond 30 mm is off
// the part. The offset was entered as 70 mm, the bore lands in empty space,
// and the kernel refuses to report that as a success: it emits
// `feature.subtractive-noop` (error) because the hole removed no material.
//
// The repair loop reads the plate's extent and clamps the anchor back onto the
// face, one bore radius clear of the edge so the result is a hole, not a notch.
//
// Run the repair walkthrough:
//   npx tsx examples/repair/run-repair-example.ts
const plate = box(60, 40, 6);

return plate.hole('top', { u: 70, v: 0, diameter: 5, depth: 10 });
