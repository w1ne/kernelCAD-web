// DELIBERATELY BROKEN — repair fixture for `examples/repair/run-repair-example.ts`.
//
// A 30 x 20 x 8 mm mounting block whose edge-round radius was typed as 16 mm.
// A fillet eats up to one radius from each side of an edge, so every edge
// here would need to be at least 32 mm long. The longest edge is 30 mm, so the
// kernel skips all 12 edges and reports
// `feature.edge-feature.short-edges-skipped` (error).
//
// The repair loop measures the shortest adjacent edge (8 mm, the block
// thickness) and the radius the same-edge kernel probe builds (3.93 mm).
// It proposes radii under that probed value, largest first. Half of 8 mm
// is not a feasible radius.
//
// Run the repair walkthrough:
//   npx tsx examples/repair/run-repair-example.ts
const blockLength = 30;
const blockWidth = 20;
const blockThickness = 8;

const block = box(blockLength, blockWidth, blockThickness);

return block.fillet(16);
