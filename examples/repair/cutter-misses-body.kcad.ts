// DELIBERATELY BROKEN — repair fixture for `examples/repair/run-repair-example.ts`.
//
// A 40 mm cube with a cable pass-through cut by a 10 mm box. The cutter was
// placed with a translate copied from another part (200, 200, 200), so it sits
// far away from the body, the subtraction removes nothing, and the kernel emits
// `feature.subtractive-noop` (error).
//
// This one shows the repair region spanning more than the failing line: the
// boolean on the last line failed, but the fix belongs on the line that
// placed the cutter. That line is an input to the boolean, so the region
// includes it, and the repair corrects the translate there.
//
// Run the repair walkthrough:
//   npx tsx examples/repair/run-repair-example.ts
const body = box(40, 40, 40);
const cutter = box(10, 10, 60).translate(200, 200, 200);

return body.subtract(cutter);
