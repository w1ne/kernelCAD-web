---
id: resolve-photo-trace-assumptions
title: Ground a photo trace before building geometry from it
tags: [reference-image, scale-anchor, assumption-ledger]
keywords:
  - trace_from_image assumption ledger
  - scale anchor missing after tracing a photo
  - resolve_assumptions before building from a reference photo
  - which waypoints are measured vs guessed
when_to_use: You called trace_from_image on a reference photo and want to know which returned waypoints are directly measured vs guessed before you feed them into path().spline() — and how to lock down a real-world scale before committing geometry.
---

```typescript
// Before this file existed, `trace_from_image` returned a `ledger` alongside
// features/diagnostics. Every fact is classified visible|inferred|assumed|
// missing — never a fabricated confidence number, always echoing the
// backend's own signal. Its `scale` fact came back `missing` (no ruler in
// the photo), so `resolve_assumptions` was called to override it with a
// measurement taken from a known hinge-to-hinge width:
//   resolve_assumptions({
//     ledgerPath: '/abs/path/brow.ledger.json',
//     resolutions: [{ id: 'brow_top', confirm: true }, { id: 'scale', value: 0.185 }],
//   })
// -> paramOverrides = { brow_top: [...waypoints], scale: 0.185 }
// `scale` (mm/px) below is that resolved value — never build geometry from a
// trace while `ledger.unresolvedCount > 0` on a `missing` fact.
const scale = 0.185; // mm per pixel, from resolve_assumptions' paramOverrides.scale
const browPointsPx: [number, number][] = [[10, 0], [40, 8], [70, 4]]; // pixel-space waypoints, resolved
const browPointsMm = browPointsPx.map(([x, y]): [number, number] => [x * scale, y * scale]);

const brow = path()
  .moveTo(browPointsMm[0][0], browPointsMm[0][1])
  .spline(browPointsMm)
  .lineTo(browPointsMm[browPointsMm.length - 1][0], -2)
  .lineTo(browPointsMm[0][0], -2)
  .close();

return brow.extrude(2);
```
