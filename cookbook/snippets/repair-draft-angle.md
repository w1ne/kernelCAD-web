---
id: repair-draft-angle
title: Repair a degenerate 90-degree draft angle
tags: [draft]
keywords:
  - feature.draft.failed
  - draft angle 90
  - mould release taper
  - repair_script draft
when_to_use: evaluate_script reported feature.draft.failed because the draft angle was geometrically degenerate (typically 90 degrees) and you want a mould-release angle derived from the lowerer, not a guess.
---

A 90° draft cannot taper a planar face. `repair_script` offers 8° / 5° / 3°,
largest first — 8° is the angle the draft lowerer already proves on a box.

The block below is the repaired result of `examples/repair/draft-angle-degenerate.kcad.ts`.

```typescript
return box(10, 10, 10).draft(8, { face: 'front' });
```
