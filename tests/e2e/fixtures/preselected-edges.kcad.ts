const size = 10;
const filletRadius = 1;

// Round-trip: build a shape, query its edges, pass the EdgeSegment[] back to fillet.
// This is the agent-facing flow for compose / multi-step refinement / cross-shape
// selection — agents pre-select with a query, refine programmatically, then apply
// the operation.
const blank = box(size, size, 5);
const topEdges = await selectEdges(blank, { atZ: 5 });
return blank.fillet(filletRadius, topEdges);
