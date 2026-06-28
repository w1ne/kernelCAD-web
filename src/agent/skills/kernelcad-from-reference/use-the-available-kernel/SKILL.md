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

## Rule 4 — Organic curves → smoothSpline

For silhouettes with smooth, non-arc transitions (Wayfarer brows, ergonomic
grips, sneaker silhouettes), USE the C1-smooth spline:

```ts
const brow = path()
  .moveTo(-28, 0)
  .smoothSpline(-14, 5)
  .smoothSpline(0, 6)
  .smoothSpline(14, 5)
  .smoothSpline(28, 0)
  .close();
```

Each `smoothSpline(x, y)` inherits its start tangent from the previous segment,
so chained calls interpolate smoothly through many points without C0 kinks.

**Why this matters:** chained `sagittaArc` segments hit OCCT BlendChain solver
cliffs at sub-arc joins — the tangent discontinuity at each join becomes a
sub-mm coplanar edge that breaks downstream fillet/chamfer. Round-6 empirical:
Agent D found the operating window for chained sagittaArcs is sagitta=0..2.9
mm, with a hard cliff at 2.95; Agent R15 had to fall back to ellipse-shaped
lens openings because their multi-arc brow kept failing. smoothSpline does
not have this failure mode.

Do NOT fake a curved brow with a single long arc — the chord bulge is visible
in the top view. Do NOT use lineTo for organic curves — the SSIM score tanks.

## Rule 5 — 4-bounded patches → surfaceFromBoundary

If a body section is bounded by exactly 4 curves (top edge + 2 sides + bottom
edge of a sculpted panel), USE `surfaceFromBoundary([top, right, bottom, left])`
to get a Coons patch. Do NOT approximate with extrude +
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

## Rule 8 — Trust the chamfer/fillet auto-skip; don't pre-disable

When you call `.chamfer(d)` or `.fillet(r)` on a body with post-cut topology
(e.g., front-face perimeter after lens openings were subtracted), the kernel
will auto-skip any target edges shorter than 2 × d (or 2 × r) and emit a
warning naming the skipped count. The chamfer **succeeds** on the long edges.

Pre-empirical pattern (BAD — leaves the acetate bevel off entirely):

```ts
// "OCCT will reject this, skip and document" — DO NOT do this
const bodyFinished = bodyWithBores;  // chamfer skipped
```

Post-fix pattern (GOOD — accept partial chamfer, agent gets a clear warn):

```ts
const bodyFinished = bodyWithBores.chamfer(0.6);
// You'll get a warning like:
//   WARN [feature.edge-feature.short-edges-skipped] chamfer_3:
//   chamfer skipped 8 of 24 target edges shorter than 2 × distance = 1.20 mm;
//   chamfering the remaining 16.
// The 16 long edges are correctly chamfered. The 8 short ones (lens-corner
// transitions) were never going to chamfer at d=0.6 anyway.
```

If you want only the LONG edges chamfered with no warning, scope the edge
query: `chamfer(0.6, { face: 'top', minEdgeLength: 1.5 })` (when query
extensions ship). Until then, accept the auto-skip; the warning is
informational, not an error.

## Rule 9 — Score against 3D geometry, not photos (when available)

Round-6 agent eval revealed the 2D-pixel scorer (`scoreRenderVsReference`)
is gameable. R5 inflated body depth 10→75mm and scored #1 vs photo (composite
0.580); R16 left lens cuts disconnected and scored higher than the fixed
version; R18 added a floating bbox-extending box outside the body and gained
+0.5 silhouette IoU. All three "hacks" optimize against render artifacts,
not against geometry.

If the eval task ships a reference STL (check `eval/tasks/<task>/reference.stl`),
USE the geometric scorer:

```bash
kernelcad export stl my-build.kcad.ts -o build.stl
npx tsx scripts/scoreMeshVsMesh.ts \
  --generated build.stl \
  --reference eval/tasks/<task>/reference.stl --json
```

Output: chamfer distance (mm), Hausdorff 99p, bbox IoU. These are pure
geometric metrics; there is no render artifact to exploit. Optimize against
THIS, not the photo composite, when you have an STL to compare against.

The 2D-photo scorer remains useful as a sanity check (does it look like the
photo?) but should not be the primary optimization target.

## Rule 10 — Patches that bound a volume → trimTo + sew + draft

If you have authored multiple `surfaceFromBoundary` or `nurbsSurface` patches
that together enclose a volume (front panel + back panel, top cap + side wall,
etc.), you must close them into a watertight solid before exporting or
boolean-ing:

1. **trimTo shared cutter surfaces** — call `.trimTo(cutterSurface)` on each
   patch so adjacent edges are cut to the same imprinted boundary, eliminating
   seam gaps. Use `.split(cutterSurface)` when both sides of a patch are needed.
2. **sew** — call `sew([...trimmedSurfaces], { requireClosed: true })` to fuse
   the coincident edges into one closed shell. `requireClosed: true` throws
   `feature.surface-sew.open-shell` immediately if the result is still open,
   letting you catch authoring gaps early rather than at export.
3. **check the result is closed** — run `kernelcad evaluate` and confirm there
   are no open-shell or watertight diagnostics.
4. **draft for mold release** — if the finished solid must release from a mold,
   call `.draft(angleDeg, { face, neutralPlane?, pullDir? })` on the face(s)
   parallel to the pull direction. Default `neutralPlane` is the named face;
   default `pullDir` is the face normal at lower time.

Do NOT call `.thicken()` on each patch individually and then union the
resulting solids — the seam discontinuity at the join creates visible shading
artifacts and the export mesher will sometimes fail the watertight gate. Use
`trimTo` / `split` + `sew` so the surfaces share topological edges.

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
