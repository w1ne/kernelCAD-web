---
id: lowpoly-game-asset
title: Low-poly parametric game asset (flat-shaded GLB for three.js / engines)
tags: [game-asset, low-poly, parameter, assembly]
keywords:
  - low poly game asset
  - three.js model glb
  - flat shaded prop for a game scene
  - asset catalog entry with knobs
  - one draw call vertex colours
  - unity godot glb prop
when_to_use: >-
  The user wants a game or web-scene prop (crate, barrel, bench, tree,
  lamp) rather than an engineering part. First call `search_assets`: the
  catalog may already have it, with knobs. Otherwise model it at real size
  in millimetres with polygon profiles and boxes, colour knobs per zone,
  choice knobs for counts, and export with `export({ format: 'glb',
  options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles } } })`:
  faceted, metres, Y up, one shared vertex-coloured material. Add `meta()`
  with kit/category/triangleBudget to put it in `catalog/kits/<kit>/`.
---

```typescript
meta({
  name: 'supply-crate',
  title: 'Supply crate',
  description: 'Wooden crate with corner posts; plank count and colours are knobs.',
  tags: ['crate', 'box', 'storage', 'prop'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  triangleBudget: 300,
});

// Colours are knobs; counts are choice knobs read with .value (numeric
// params are symbolic and cannot drive a JS loop).
const wood = param('wood', '#a0703c', { label: 'Planks' });
const trim = param('trim', '#5c3d22', { label: 'Corner posts' });
const planks = param('planks', '3', { choices: ['2', '3', '4'], label: 'Planks per side' });

const size = 600; // mm, real size
const post = 60;
const n = Number(planks.value);
const gap = 12;
const plankH = (size - gap * (n + 1)) / n;

const crate = assembly('supply-crate');
// Base on z = 0, centred on x = y = 0: the GLB then stands on y = 0.
// Slats are unioned onto the body, not into a loose group of their own: planks
// that only cross the body never touch each other, so unioning them alone gives
// several floating solids (union.disconnected). Union each group with the body
// so the crate stays one connected piece.
const body = box(size - 2 * post, size - 2 * post, size, true).translate(0, 0, size / 2);
const slats: ReturnType<typeof box>[] = [body];
for (let i = 0; i < n; i++) {
  const z = gap + i * (plankH + gap) + plankH / 2;
  slats.push(box(size - 2 * post, size, plankH, true).translate(0, 0, z));
  slats.push(box(size, size - 2 * post, plankH, true).translate(0, 0, z));
}
crate.part('planks', union(...slats).color(wood));
// Posts bite `embed` into the body: touching face-to-face at exactly x = 240 is
// a zero-volume contact that does not reliably fuse into one solid.
const embed = post / 2;
const posts = [-1, 1].flatMap((sx) => [-1, 1].map((sy) =>
  box(post, post, size, true).translate(
    sx * (size - post - embed) / 2, sy * (size - post - embed) / 2, size / 2)));
crate.part('posts', union(body, ...posts).color(trim));

return crate.model();
```
