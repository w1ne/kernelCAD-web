---
id: wrap-texture-can-label
title: Wrap a bitmap texture around a cylinder
tags: [texture, wrap]
keywords:
  - wrap a texture around a cylinder
  - cylindrical UV projection wrapTexture
  - wrapTexture
  - projected bitmap texture
  - cylinder texture wrap
  - image texture on curved surface
  - cylindrical UV projection
when_to_use: >-
  You need a bitmap texture (label, decal, logo) wrapped onto a cylinder
  without hand-authoring UVs. Call `shape.wrapTexture(imageRef, { type:
  'cylinder', axis })` so UVs are projected from final world-space vertices;
  `{ type: 'flat' | 'sphere' | 'box' }` cover planar and other wraps.
---

```typescript
const height = 60;
const radius = 20;

// 1×1 PNG data URL keeps this recipe self-contained (no sidecar file).
// Swap `path` for a real image when wrapping a production label.
// Fillet + translate AFTER wrapTexture on purpose: UVs re-derive from
// the final world-space vertices, so the wrap stays put.
const body = cylinder(height, radius)
  .wrapTexture(
    { path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' },
    { type: 'cylinder', axis: [0, 0, 1] },
  )
  .fillet(1)
  .translate(0, 0, 0);

return body;
```
