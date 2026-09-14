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
// trace_from_image returns a `ledger` alongside features/diagnostics. Every
// fact is classified visible|inferred|assumed|missing — never a fabricated
// confidence number, always echoing the backend's own signal.
const traced = await mcp.trace_from_image({
  imageUrl: 'file:///abs/path/brow.png',
  features: [{ label: 'brow_top', kind: 'curve' }],
  // No scaleAnchor supplied here on purpose — see the `scale` fact below.
});

// traced.ledger.facts:
//   { id: 'brow_top', kind: 'inferred', confidence: 0.81, resolution: 'open' }  // vision-llm-labeled
//   { id: 'scale', kind: 'missing', confidence: 0, resolution: 'open' }        // no ruler in the photo

// Resolve the open facts before building geometry: confirm the traced curve,
// override the scale with a measurement taken from the photo (e.g. a known
// hinge-to-hinge width).
const resolved = await mcp.resolve_assumptions({
  ledgerPath: '/abs/path/brow.ledger.json',
  resolutions: [
    { id: 'brow_top', confirm: true },
    { id: 'scale', value: 0.185 }, // mm per pixel, derived from a measured reference dimension
  ],
});

// resolved.paramOverrides = { brow_top: [...waypoints], scale: 0.185 }
// Feed resolved.paramOverrides.scale into your mm conversion before
// path().spline(...) — do not build geometry while `unresolvedCount > 0`
// on a `missing` fact; call trace_from_image with `validate: 'error'` to
// make that a hard gate instead of a warning.
```
