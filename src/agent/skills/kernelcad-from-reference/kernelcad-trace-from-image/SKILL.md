---
name: kernelcad-trace-from-image
description: Convert pixel-space features from a reference photo into normalized [0,1] waypoints, then into mm coordinates feedable to path().spline / path().nurbsSegment. Uses the trace_from_image MCP tool. Load when your blockout is in place and the next step is an organic-curve outline (eyewear brow, ergonomic handle, sneaker midsole) that would take more than a minute to eyeball off the photo.
---

# kernelcad-trace-from-image

## Purpose

This is a **coord-extractor**, not a vision agent. It takes a reference photo
plus a list of requested features and returns normalized `[0,1]` waypoints
the agent can convert to mm via a known scale anchor and feed to a
`path().spline()` / `path().nurbsSegment()` chain.

**Accuracy honesty.** opencv's contour is geometrically exact on a uniform-bg
photo. Claude vision is typically 5–10% off on dense landmarks. Every
returned feature carries a per-feature `confidence` in `[0, 1]`. Treat the
output as **better starting-point waypoints**, not pixel-perfect coords —
the model will still need at least one render→inspect pass before finalizing.

Output replaces the burden of eyeballing dozens of `(x, y)` pairs off a photo;
it does **not** replace the spec-writer.

## Inputs

- `.kcad.ts` blockout already in place (from `blockout-model/SKILL.md`).
- Reference photo on disk (`./reference.jpg` typically).
- A scale anchor from the Real Object Brief — at least one numeric length
  (mm) over a known fraction of the image width or height. Without a scale
  anchor the normalized output cannot be lifted to mm.

## When to load this skill

Load if **all three** are true:

1. The reference image shows an **organic curve** — brow, knurl, ergonomic
   contour, sneaker midsole, eyewear front silhouette.
2. The next authoring step is a `path().spline()`, `path().nurbsSegment()`,
   `path().hermiteG2()`, or a `nurbsCurve(...)` ref.
3. Eyeballing the waypoints would take more than ~60 seconds **or** the
   result would be unverifiable (i.e. you could not tell from looking at
   your own notes whether `(12.3, 4.1)` was right).

Do **not** load this skill for:

- Box / cylinder / rounded-rect blockouts — every primary dimension already
  lives in a `param()`.
- References where the brief already enumerates the waypoints.
- CAD screenshots (vector geometry already, not a photo).

## The trace pipeline (4 steps)

### Step 1 — Decide features

Pick the smallest set of features that captures the outline you want.

**Single silhouette.** For a one-piece organic outline (eyewear brow as a
single curve, sneaker side profile), request one feature:

```json
{ "features": [{ "label": "frame_brow", "kind": "silhouette" }] }
```

**Silhouette + named points.** When you also need landmarks that a contour
extractor cannot label (the bridge midpoint between two lenses, the lens
center, the brow tip), add them with `kind: "point"`:

```json
{
  "features": [
    { "label": "frame_brow",  "kind": "silhouette" },
    { "label": "bridge_top",  "kind": "point",
      "region": "between the lenses, top edge" },
    { "label": "lens_left_center", "kind": "point",
      "region": "center of the left lens" }
  ]
}
```

**Naming convention.** Use `snake_case` and the form `<part>_<role>` so that
the same labels can flow into kernelCAD constant names (`const bridge_top
= [...];`). The label is echoed verbatim in the response.

**Backend hint.** Leave `backend` unset; let the router pick. The router
falls through to:

- `'opencv'` — uniform background + silhouette/curve features only.
- `'hybrid'` — uniform background + any `point`/`bbox` feature.
- `'vision-llm'` — cluttered background; or you explicitly want the LLM.

Forcing `'opencv'` on a `point`/`bbox` request emits a
`tool.trace-from-image.opencv-cannot-label` warning — opencv returns the
silhouette for every feature.

### Step 2 — Call `trace_from_image`

```text
trace_from_image({
  imageUrl: "file:///path/to/reference.jpg",
  features: [
    { "label": "frame_brow", "kind": "silhouette" },
    { "label": "bridge_top", "kind": "point" }
  ],
  maxWaypointsPerFeature: 14
})
```

**Picking `maxWaypointsPerFeature`:**

| Curve character                                | Suggested cap |
|------------------------------------------------|---------------|
| Shallow (one bow, e.g. handle back)            | 6–8           |
| Medium (eyewear brow, sneaker top profile)     | 10–14         |
| Highly inflected (S-curves, ergonomic grips)   | 16–20         |

A cap that's too high wastes context; too low loses inflection points.
Start at 12 (the default), adjust on the second call if the curve looks too
chunky or too noisy.

### Step 3 — Sanity-check the response

Each returned feature has `{ label, kind, waypoints, confidence, backend }`.
Before converting to mm:

| Check                 | Action if violated                          |
|-----------------------|---------------------------------------------|
| `confidence >= 0.6`   | Re-call with a tighter `region`, OR force `backend: "hybrid"`. If still <0.6 after the retry, add a `// confidence N, hand-corrected` comment when you commit the mm coords. |
| Waypoint count fits the curve character above | Adjust `maxWaypointsPerFeature` and re-call. |
| First waypoint sits on the curve's expected start | If not, you cannot just paste — adjust the `moveTo()` argument to match `waypoints[0]`. |

### Step 4 — Convert normalized → model space

Pick a scale anchor from the Real Object Brief — for example,
`frameWidth = 130 mm` over `0.84` of the image width.

```ts
// Scale anchor: frame outer width 130 mm spans 0.84 of the image width.
const FRAME_WIDTH_MM   = 130;
const FRAME_NORM_SPAN  = 0.84;
const MM_PER_NORM_X    = FRAME_WIDTH_MM / FRAME_NORM_SPAN;
const MM_PER_NORM_Y    = MM_PER_NORM_X; // assumes square pixels — confirm

// Center the image's normalized origin (0.5, 0.5) at the model origin.
// Flip Y because the photo's top-left origin disagrees with our XZ plane.
const toMm = ([nx, ny]: [number, number]): [number, number] => [
  (nx - 0.5) * MM_PER_NORM_X,
  -(ny - 0.5) * MM_PER_NORM_Y,
];

const browWaypointsMm = traced.features[0].waypoints.map(toMm);

const brow = path()
  .moveTo(...browWaypointsMm[0])
  .spline(browWaypointsMm.slice(1));
```

The Y flip is **load-bearing** — image-space `y` grows downward, the model's
`z`/`y` grows upward. Without the flip the brow appears inverted.

## Sanity render

Always render the updated `.kcad.ts` before committing:

```bash
kernelcad render build.kcad.ts --width 1920 --height 1080 -o /tmp/trace-check.png
```

Open `/tmp/trace-check.png` and confirm the traced curve matches the
reference outline visually. Only after that is plausible, hand off to
`image-replicator/SKILL.md` for the render→score→iterate loop.

## Common failure modes

- **Cluttered photo with `backend: "opencv"` forced.** opencv returns the
  largest dark blob, which on a hand-held photo is usually the camera or
  shadow, not the artifact. **Fix:** drop the override; the router picks
  `'vision-llm'` automatically.
- **LLM returned waypoints in the wrong traversal order.** The prompt asks
  for counter-clockwise from the topmost-leftmost vertex; sometimes the
  model walks clockwise. **Fix:** re-call with an explicit
  `hint: "traverse the brow left-to-right along its top edge"`.
- **First waypoint sits 5 mm off the prior `moveTo()`.** The path-builder
  emits `feature.path.spline.degenerate-points`. **Fix:** update the
  `moveTo()` to match `waypoints[0]` exactly.
- **Asymmetric trace on a symmetric part.** Trace ONE half (use `region:
  "left half of the brow only"`), then `.mirror('YZ')` in the model.

## Verification gates

| Gate                       | Pass criterion                                             |
|----------------------------|------------------------------------------------------------|
| G-trace-confidence         | Every feature has `confidence >= 0.6`, OR the script carries a `// confidence N, hand-corrected` comment naming that feature. |
| G-trace-scale-anchor       | The script contains a comment that names the scale anchor used (e.g. `// Scale anchor: frameWidth = 130 mm spans 0.84 of the image width`). |
| G-trace-first-waypoint     | The PathBuilder chain begins with `moveTo(<first traced waypoint>)` before any `.spline()` or `.nurbsSegment()` taking traced waypoints. |

## Hand-off

Once the traced curve renders plausibly, proceed to
`image-replicator/SKILL.md` for the render→score→iterate loop that closes
the gap between the traced outline and the reference photo.

## Tool reference

- `trace_from_image` — the MCP tool this skill drives. Caller-supplied
  `ANTHROPIC_API_KEY` is required when the router picks `'vision-llm'` or
  `'hybrid'`. Cost ~$0.005 per call against Claude Haiku — do **not** loop
  `trace_from_image` inside an outer iteration loop. One call per
  surface/curve is enough.
