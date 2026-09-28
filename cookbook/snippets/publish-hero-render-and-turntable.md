---
id: publish-hero-render-and-turntable
title: Share-ready hero image and 360° turntable of a finished design
tags: [render, turntable, assembly]
keywords:
  - hero image
  - product shot
  - studio render
  - publish preset
  - transparent background png
  - gallery tile
  - readme image
  - social post
  - turntable gif
  - 360 orbit video
  - render_preview preset publish
  - capture_animation turntable
when_to_use: >-
  The design is done and you need pictures to share it — a gallery tile, a
  README image, a social post or a product page — not an engineering review.
  Colour every part (or give it a material) in the script, then call
  render_preview({ file, preset: 'publish' }) for ONE studio 'hero' PNG
  (3/4 front-right, soft contact shadow, white backdrop, 1600×1200; width and
  height up to 2048; background: 'transparent' for a PNG with alpha, or
  'light' / 'dark' / '#rrggbb'). For a seamless 360° loop call
  capture_animation({ file, turntable: true, output_path: 'x.gif' }) (or .mp4;
  frames_dir keeps alpha). The camera centres and frames the silhouette
  itself, so do not add setCameraTarget for these shots. The output is
  deterministic: re-rendering the same file gives the same pixels. Use the
  default preset (no preset) while you still iterate on geometry.
---

```typescript
// Colour / material per part — the publish preset renders them as authored.
const arm = assembly('desk-lamp');
arm.part('base', cylinder(8, 40).color('#1f2937'));
arm.part('post', cylinder(120, 5).color('#d1d5db'), { at: [0, 0, 8] });
arm.part('shade', cylinder(30, 22).color('#f59e0b'), { at: [0, 0, 128] });
return arm.model();

// Then, from the MCP client:
//   render_preview({ file: 'lamp.kcad.ts', preset: 'publish' })
//     → images: [{ name: 'hero', path: '.../hero.png' }]
//   render_preview({ file: 'lamp.kcad.ts', preset: 'publish', background: 'transparent', width: 2048, height: 2048 })
//   capture_animation({ file: 'lamp.kcad.ts', turntable: true, output_path: 'lamp.gif', width: 640, height: 640, fps: 20 })
```
