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

When every target edge is shorter than twice the requested radius, the
kernel skips them and reports `feature.edge-feature.short-edges-skipped`.
Half the shortest adjacent edge is a geometric ceiling, not a radius that
has been built.

Do not guess a smaller number, and do not label that ceiling feasible. Run
the repair loop:

1. `why_did_this_fail({ file })` returns the `repairRegion` (the fillet line
   and the line that built its input) and ranked `candidates`. Each candidate
   includes the geometry it came from. `shortestAdjacentEdgeMm` is the
   measured edge. `maxFeasibleValueMm` is present only when the same-edge
   kernel probe built that value. On this block the shortest edge is 8 mm
   (ceiling 4 mm) and the probe builds 3.93 mm:
   `{ shortestAdjacentEdgeMm: 8, maxFeasibleValueMm: 3.93 }`.
2. `repair_script({ file, diagnostic, strategy: 'dry-run' })` previews every
   candidate as a diff without applying anything.
3. `repair_script({ file, diagnostic, strategy: 'apply-first' })` (or
   `'try-all'`) applies a candidate, re-evaluates, and returns `new_code` only
   if the diagnostic cleared with no new errors. Persist `new_code` yourself.

The block below is the repaired result of `examples/repair/oversized-fillet.kcad.ts`,
which started as `block.fillet(16)` on an 8 mm-thick block. The accepted
candidate is 3.2 mm, under the 3.93 mm radius the kernel probe built on
these edges, which keeps a flat band on each side face instead of rounding
the block into a pill. Load the `kernelcad-repair` skill for the full loop.

```typescript
const blockLength = 30;
const blockWidth = 20;
const blockThickness = 8;

// Kernel probe on these edges builds 3.93 mm. 3.2 mm stays under that.
const edgeRound = 3.2;

const block = box(blockLength, blockWidth, blockThickness);

return block.fillet(edgeRound);
```
