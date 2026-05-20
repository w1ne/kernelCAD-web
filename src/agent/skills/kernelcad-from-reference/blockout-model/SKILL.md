---
name: blockout-model
description: Coarse parametric blockout of the primary masses before committing to detail. Establishes the bounding envelope, canonical-view alignment, and reference-image plane, then confirms the blockout is plausible before detail work begins.
---

# blockout-model

## Purpose

The blockout pass produces a coarse, parametric approximation of the object's
primary masses. It is not a finished model — it is a testable hypothesis:
"does this bounding envelope match the reference silhouette in all canonical
views?" Only after the blockout is plausible does detail work begin.

## Inputs

- The `// Real Object Brief` from `prepare-prompt/SKILL.md`.
- The reference photo path.

## What to do

### Step 1 — Declare key params

Map each dimension in the brief's Scale section to a `param()`. Use the brief's
estimated value as the default:

```ts
const frameW  = param('frameWidth',  130, { min: 100, max: 160, description: 'outer frame width mm' });
const frameH  = param('frameHeight',  48, { min: 30,  max: 70  });
const bodyD   = param('bodyDepth',     5, { min: 2,   max: 12  });
const bridgeW = param('bridgeWidth',  18, { min: 10,  max: 30  });
```

All key dimensions must be params, not magic numbers. The blockout must be
adjustable after the first canonical-view check without touching geometry code.

### Step 2 — Place the reference image overlay

Pick the view plane that shows the most information. For most flat products,
the front view is the XZ plane:

```ts
referenceImage('./reference.jpg', {
  plane: 'xz',
  anchor: 'origin',
  scale: 'fit-bbox',
  opacity: 0.35,
});
```

The reference image does not affect the score (it is hidden during scoring).
It is for visual alignment during authoring.

### Step 3 — Build primary mass boxes

One `box()` or `extrudeRoundedRect()` per major component. No holes, no
features, no material yet. Translate each into position. For symmetric objects,
build one half only and call `.mirror()` after the blockout check:

```ts
// primary lens+frame slab
const frameBody = extrudeRoundedRect(frameW, frameH, bodyD, 4)
  .translate(-frameW / 2, 0, -frameH / 2);

// arm stubs — one side, to be mirrored
const armStub = box(50, armW, armT)
  .translate(frameW / 2, 0, -armT / 2);

const full = frameBody.union(armStub.mirror('YZ'));
return full;
```

### Step 4 — Render canonical views and check the blockout

```bash
kernelcad render build.kcad.ts --width 1920 --height 1080 -o /tmp/blockout.png
```

Read the PNG back. Check against the brief's Validation focus:

| Check | Pass criterion |
|-------|----------------|
| Front silhouette | Outer outline matches the reference image overlay within ~10% |
| Top depth | Body depth reads as non-trivial (not a slab) |
| Iso plausibility | Primary masses are in roughly the right relative positions |

If any check fails: adjust the relevant `param()` default and re-render. Do NOT
add detail yet — fix the envelope first.

### Step 5 — Run evaluate

```bash
kernelcad evaluate build.kcad.ts
```

The blockout must be diagnostic-free before proceeding. Zero features failing,
zero errors. Warnings are acceptable if they identify deferred features.

## Done

The blockout is done when:

1. All primary masses are present as params-driven primitives.
2. The canonical views show no gross silhouette mismatch vs. the reference.
3. `kernelcad evaluate` exits clean.
4. `kernelcad interference` reports zero pairs.

Only then proceed to `use-the-available-kernel/SKILL.md` to plan the detail pass,
then `image-replicator/SKILL.md` to iterate.

## Blockout anti-patterns

- **Detailing before blockout**: adding fillets, lens geometry, or material
  before the envelope check is confirmed. This makes it hard to adjust global
  params later.
- **Committing to one view only**: render all four canonical views. A front-view
  blockout that is a flat slab tanks the SSIM score in iso and top views.
- **Magic numbers in geometry**: every primary dimension in the blockout must be
  traceable to a `param()`. Magic numbers make the blockout rigid.
- **Skipping interference**: two primary masses that overlap in the blockout will
  produce artefacts in boolean operations in the detail pass. Fix overlaps in
  the blockout.

## Next sub-skill

Two paths after the blockout passes:

- **Right-angled / parametric shape** (everything captured by box, cylinder,
  rounded-rect, fillet/chamfer): proceed directly to `image-replicator/SKILL.md`
  for the render→score→iterate loop.
- **Organic curves** (eyewear brow, ergonomic handle, sneaker midsole — anything
  where you'd otherwise eyeball waypoints off the reference): load
  `kernelcad-trace-from-image/SKILL.md` FIRST to extract normalized waypoints
  from the photo, then `image-replicator/SKILL.md`.
