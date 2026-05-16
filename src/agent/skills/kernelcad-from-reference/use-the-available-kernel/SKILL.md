---
name: use-the-available-kernel
description: Hard rules for which kernelCAD primitive to reach for when authoring from a reference photo. The from-reference loop fails most often because the author defaults to easy primitives and skips ones that exist. Read before writing any geometry.
---

# use-the-available-kernel

The from-reference loop fails most often not because kernelCAD lacks a
primitive, but because the author did not reach for one that exists. This skill
is a checklist of hard rules: when condition X holds in the reference, USE
primitive Y.

## Rule 1 — Non-uniform corner radii → variable fillet

If the reference shows a product where different corners have visibly different
radii (Wayfarer brow: 4 mm at temple, 8 mm at outer-top wing corner; bottle
shoulders; controller grips), USE the variable-radius form:

```ts
shape.fillet([
  { edges: { face: 'top', byNormal: '+Z' }, radius: 8 },
  { edges: { face: 'top', byNormal: '+Z', region: 'temple' }, radius: 4 },
]);
```

Do NOT author with repeated single-radius `.fillet(r)` calls and live with a
uniform-look body. The scorer detects the sharp vs. rounded corner curvature
mismatch in the silhouette gate.

## Rule 2 — Symmetric parts → mirror, author one side

If the reference is symmetric about a cardinal plane (eyewear: YZ; most bottles:
ZY axis; most consumer products: some cardinal plane), build the right half
explicitly and call `.mirror('YZ')`:

```ts
const right = bodyHalf();
const full = right.mirror('YZ');
```

Do NOT author both halves manually with mirrored arcs. The cost is roughly 2×
LoC and creates inevitable asymmetry bugs — the scorer will detect the SSIM
break on the opposite side of the model.

## Rule 3 — Cross-section varies along the body → surfaceFromCurves

If the body is visibly thicker at one end and thinner at another (acetate
frames, handle grips, bottle necks), USE `surfaceFromCurves` with 2–3
cross-section profiles and `.thicken(t)`:

```ts
const body = surfaceFromCurves([
  outlineAtTemple,
  outlineAtBridge,
  outlineAtTemple.mirror('YZ'),
]).thicken(15);
```

Do NOT uniform-extrude a single silhouette. The resulting slab is what the
scorer detects as a "fake" body — the silhouette gate passes, but the SSIM gate
fails because the depth profile is wrong.

## Rule 4 — Organic curves → NURBS curve or chained arcs

For silhouettes with smooth, non-arc transitions (Wayfarer brows, handle curves),
use NURBS curve authoring when available in a follow-up slice. Until then,
chain at most 3 `tangentArc` / `sagittaArc` segments and keep tangent
reachability conservative:

```ts
const brow = path()
  .moveTo(-28, 0)
  .sagittaArc(-14, 5, 3)
  .sagittaArc(0, 6, 2)
  .sagittaArc(14, 5, 3)
  .sagittaArc(28, 0, 3)
  .close();
```

Do NOT fake a curved brow with a single long arc — the chord bulge is visible
in the top view. Do NOT use lineTo for organic curves — the SSIM score tanks.

## Rule 5 — 4-bounded patches → surfaceFromBoundary (available in a follow-up slice)

If a body section is bounded by exactly 4 curves (top edge + 2 sides + bottom
edge of a sculpted panel), USE `surfaceFromBoundary([top, right, bottom, left])`
to get a Coons patch — once available. Do NOT approximate with extrude +
boolean trim; the resulting surface is faceted, not smooth, and SSIM detects it.

## Rule 6 — Glossy products → PBR material

Real consumer products read as "real" largely because of specular reflections.
USE `Shape.material()` with `clearcoat` and `roughness`:

```ts
shape.material({
  baseColor: '#0a0a0a',
  metalness: 0.0,
  roughness: 0.15,
  clearcoat: 0.8,
  clearcoatRoughness: 0.05,
  ior: 1.55,    // acetate IOR
});
```

Do NOT use `.color('#0a0a0a')` for a product with visible gloss. SSIM scoring
detects shading differences; a flat-color model tanks the score when the
reference has specular highlights. The role-token shortcuts (`.color('servo')`,
`.color('frame')`, etc.) are for schematic coloring in mechanisms — not for
photorealistic product surfaces.

Material must be applied BEFORE the shape enters a boolean. Coloring the
post-union root is a no-op; see `kernelcad-authoring` Conventions.

## Rule 7 — Reference photo → referenceImage overlay

While iterating, USE `referenceImage(path, opts)` so the Studio viewport shows
the photo behind your model. The agent's "eyes" are the renderer + scorer; the
photo overlay closes the visual feedback loop without needing a separate
compositing step:

```ts
referenceImage('./reference.jpg', {
  plane: 'xz',
  anchor: 'origin',
  scale: 'fit-bbox',
  opacity: 0.4,
});
```

The eval scorer automatically excludes reference images during scoring
(`--hide-reference-images` flag). They do not pollute the score.

## When NOT to apply a rule

These rules are defaults — they steer the author toward the kernel surface that
works. If the reference is genuinely a uniform slab with sharp corners
(laser-cut sheet metal, plate stock for CNC), Rule 1 doesn't apply. If the
object has a compound axis of symmetry that is not a cardinal plane (angled
bracket), Rule 2 doesn't apply directly — use `.reflect()` with an offset
plane.

Use judgment. But if you find yourself skipping a rule on a product photo,
examine the photo again — the rule probably DOES apply and you are defaulting
to easy primitives. The most common failure mode is authoring with
path+extrude+booleans alone when the reference is an organic product. Check all
7 rules before starting geometry.
