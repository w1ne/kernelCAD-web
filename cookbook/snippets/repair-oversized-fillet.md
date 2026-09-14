---
id: repair-oversized-fillet
title: Repair a failing fillet whose radius is larger than the edges
tags: [fillet, chamfer, edge-features]
keywords:
  - repair failing fillet
  - fix a fillet that failed
  - fillet radius too large
  - fillet skipped all edges
  - chamfer distance too large
  - short-edges-skipped
  - repair_script
  - why_did_this_fail
when_to_use: evaluate_script reported feature.edge-feature.short-edges-skipped (every target edge is shorter than twice the radius) and you want a bounded fix instead of guessing a new radius.
---

A fillet consumes up to one radius from each side of an edge, so its radius
can never exceed half the shortest edge it touches. When it does, the kernel
skips every edge and reports `feature.edge-feature.short-edges-skipped`.

Do not guess a smaller number. Run the repair loop:

1. `why_did_this_fail({ file })` returns the `repairRegion` (the fillet line
   and the line that built its input) and ranked `candidates`. Each candidate
   includes the geometry it came from, e.g.
   `{ shortestAdjacentEdgeMm: 8, maxFeasibleValueMm: 4 }`.
2. `repair_script({ file, diagnostic, strategy: 'dry-run' })` previews every
   candidate as a diff without applying anything.
3. `repair_script({ file, diagnostic, strategy: 'apply-first' })` (or
   `'try-all'`) applies a candidate, re-evaluates, and returns `new_code` only
   if the diagnostic cleared with no new errors. Persist `new_code` yourself.

The block below is the repaired result of `examples/repair/oversized-fillet.kcad.ts`,
which started as `block.fillet(16)` on an 8 mm-thick block. The accepted
candidate is 0.4 × the shortest edge, 3.2 mm, which keeps a flat band on
each side face instead of rounding the block into a pill. Load the
`kernelcad-repair` skill for the full loop.

```typescript
const blockLength = 30;
const blockWidth = 20;
const blockThickness = 8;

// Fillet ceiling = shortest adjacent edge / 2 = blockThickness / 2 = 4 mm.
const edgeRound = 3.2;

const block = box(blockLength, blockWidth, blockThickness);

return block.fillet(edgeRound);
```
