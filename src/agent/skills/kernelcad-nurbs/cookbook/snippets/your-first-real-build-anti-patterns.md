# Anti-patterns from your first real build

Distilled from the iteration journey that turned an eval task from a black
trapezoid blob into a recognizable Wayfarer in 8 rounds. Each item below is
something that would have saved a round if I had checked it before the first
render.

## 1. Default sketch plane is XY; the renderer's front view looks down −Y

`path()` lays its segments in the XY plane. If you `.extrude(N)` and return
the body straight away, the body extends along +Z, with its footprint in XY.
The Studio renderer's default front view (az=0, el=0) looks down −Y, so it
shows the body's *side*, not its front face. A model authored this way looks
like a horizontal stripe across the middle of the frame.

**Fix:** for front-facing models (eyewear, panels, displays), rotate the
extrude to push depth into the +Y direction so the sketch plane becomes the
viewing plane:

```ts
const body = silhouette.extrude(DEPTH).alongAxis([0, 1, 0]);
```

Now the sketch lives in world XZ (because the rotation took sketch-Z into
world-Y) and the renderer's front view shows the front face.

## 2. After `alongAxis([0, 1, 0])`, sketch-Y maps to negative world-Z

This is a sign-flip that bites every notch, cutout, and asymmetric feature
that you author with `.lineTo(_, +y)` expecting it to go "up" in world space.

After `.extrude(N).alongAxis([0, 1, 0])`:

- sketch X → world X (unchanged)
- sketch Y → **−world Z** (flipped)
- extrude Z → world Y

A notch sketched with `.lineTo(0, -4)` (intuitively "down" in sketch) shows
up as a notch pointing **up** in world space. If you want a feature that
points down in the rendered output, sketch it pointing up. Or, more robustly,
build the feature as a primitive (`cylinder`, `box`) whose orientation is
explicit and not tied to a sketch's chirality.

## 3. Union with per-leaf material hides leaf colors in the final render

If you union two shapes that each carry their own material, the boolean-fused
`Shape` only carries one material — the head shape's. Lens-insert pattern is
the canonical trap:

```ts
// ❌ This silently hides the tinted lens insert.
const glasses = body.subtract(lensHole)
  .union(lensInsert.finish('glass-tinted'))              // glass-dark
  .finish('abs', { color: '#1a1a1a' });                  // frame-black

// kernelcad render emits a "material shadowing — leaf <X> has its own
// material but is unioned into <Y> which also has its own material" warning.
```

**Fix:** keep visually distinct components as separate `arm.part(...)`
entries in an assembly, or just don't try to carry per-leaf materials
through a boolean. If the feature you wanted is a *hole*, leave it as a
hole (gray background showing through) rather than filling it with an
invisible insert.

## 4. `divideByEqualArcLength(N)` sample-index math for two-feature placement

For a smooth, near-linear 3D curve from `[-X0, ...]` to `[+X0, ...]`,
`brow.analytics.divideByEqualArcLength(N)` returns `N + 1` samples at
`s = k / N` for `k = 0..N`. The world-X of sample `k` is approximately
`X0 × (2k/N − 1)`.

If you want a pair of features (e.g. two lens centers) at world-X `±D`, pick:

- `N = 4`, samples [1] and [3] → at `±X0 / 2`. So set `X0 = 2D`.
- `N = 6`, samples [2] and [4] → at `±X0 / 3`. So set `X0 = 3D`.
- `N = 8`, samples [3] and [5] → at `±X0 / 4`. So set `X0 = 4D`.

It is much easier to pick `N` and brow span together to *force* the right
samples than to back-solve from arbitrary curve geometry. If the brow needs
to span more than your frame allows, your sample index is wrong — pick a
larger `N`.

## 5. `subtract` chain reliability is uneven; use the `let frame = ...` form

`a.subtract(b).subtract(c)` looks like it should chain — and it does pass
typecheck — but on some shape configurations the second cut is silently
dropped (we have seen this with cylindrical cutters where the boolean ops
produce intermediate shapes the next cut can't operate on).

**Fix:** assign each cut to a variable and chain through it:

```ts
let frame = body;
frame = frame.subtract(leftLensCut);
frame = frame.subtract(rightLensCut);
frame = frame.subtract(noseNotch);
frame = frame.subtract(cameraCut);
frame = frame.subtract(ledCut);
```

This pattern is also easier to comment line-by-line, easier to disable a
single cut for debugging, and easier to ship past the "I forgot what I
already subtracted" hour of authoring.

## 6. Render at the scorer pose before committing — JSON `ok: true` is not visual proof

`evaluate <file>.kcad.ts --json` returns `ok: true, featureCount: N,
diagnostics: []` for any script that *runs*. It does not tell you whether
the rendered output looks like the thing you wanted. The eval-harness scorer
runs at a specific pose (look in the task's `harness.ts` for the
`REFERENCE_POSE` constant — typically `30,15` for the canonical front-right
product shot).

**Fix:** every visible feature change goes through this loop:

```bash
node dist/cli/index.js render <file> -o /tmp/check.png --pose 30,15 --hide-reference-images
# Open /tmp/check.png. Confirm:
#  • The feature you just added is visibly present.
#  • The feature you didn't intend to change is unchanged.
#  • The silhouette looks like the reference photo at the same pose.
```

Skipping this loop costs more than running it. Every time.

---

The 8 iterations that produced the Wayfarer rewrite for `eyewear-wayfarer-front`
hit every item above. Reading this snippet first would have taken that to 2.
