---
id: repair-emboss-over-hole
title: Repair an emboss whose glyphs sit over a void
tags: [emboss]
keywords:
  - feature.emboss-text.boolean-noop
  - emboss over a void
  - engrave missed the body
  - repair_script emboss anchor
when_to_use: evaluate_script reported feature.emboss-text.boolean-noop because the glyph prism was parked over a void and you want the UV anchor moved onto remaining solid.
---

An engrave whose glyphs sit in a through-hole changes no volume. `repair_script`
slides `anchorU` / `anchorV` to 0.2, a remaining corner of a convex face.

The block below is the repaired result of `examples/repair/emboss-over-hole.kcad.ts`.

```typescript
return box(40, 40, 6).hole('top', { u: 0, v: 0, diameter: 20, depth: 'through' })
  .embossText({ textContent: 'HI', face: 'top', size: 4, depth: -0.5, anchorU: 0.2, anchorV: 0.2 });
```
