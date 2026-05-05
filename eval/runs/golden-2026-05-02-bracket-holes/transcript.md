# bracket-holes — mock-model — GOLDEN

## Prompt
> # Task: Parametric L-Bracket
> 
> Build an L-shaped mounting bracket that works for different bolt sizes.
> 
> The script must accept this parameter (verbatim — name matters):
> 
> ```typescript
> const boltDiam = param('boltDiam', 5, { min: 3, max: 10 });
> ```
> 
> Functional requirements:
> 
> - The bracket is L-shaped: two perpendicular flat plates joined at a right angle.
> - Each plate has a single mounting hole. Hole diameter = `boltDiam + 0.5` mm (a 0.5mm clearance fit).
> - Wall thickness (the dimension across each plate's smallest face) is at least `2 * boltDiam` mm.
> - Each plate is at least `3 * boltDiam` mm in width and at least `3 * boltDiam` mm in height.
> - The plates are connected (a single solid, not two free-floating slabs).
> 
> The script must `return` a single Shape.
> 
> Use kernelCAD's primitives and boolean operations. Z-up, millimetres, degrees.
> 

## Turn 1 (in: 4,231 tok, out: 60 tok, 0.0s)

Here's a first attempt — I'll just round the top:

```typescript
return sphere(5).fillet(1, { face: 'top' });
```

## Evaluate (attempt 1) — FAIL
- `feature.face-ref.not-applicable` — Canonical face 'top' is not applicable to 'sphere' primitive. (feature: fillet_1)
  Hint: That canonical face doesn't exist on this primitive (sphere has no canonical faces; cylinder has only top/bottom).

## Turn 2 (in: 4,801 tok, out: 290 tok, 0.0s)

I see — sphere doesn't accept a { face } filter. Here's the proper L-bracket per the prompt:

```typescript
const boltDiam = 5;

const t = 2 * boltDiam;       // wall thickness
const w = 4 * boltDiam;       // plate width/length (>= 3 * boltDiam)
const h = 3 * boltDiam;       // plate height (>= 3 * boltDiam)
const holeR = (boltDiam + 0.5) / 2;

// Horizontal plate (foot of the L): x in [0,w], y in [0,h], z in [0,t].
// Hole through Z at plate centroid.
const horiz = box(w, h, t).subtract(
  cylinder(t + 2, holeR).translate(w / 2, h / 2, -1),
);

// Vertical plate (upright of the L): x in [0,t], y in [0,h], z in [t, t+w].
// Sits flush on top of the horizontal plate's near edge — no volume overlap.
// Hole through X at the centroid of the vertical face.
const vert = box(t, h, w).subtract(
  cylinder(t + 2, holeR).rotate([0, 1, 0], 90).translate(-1, h / 2, w / 2),
).translate(0, 0, t);

return horiz.union(vert);

```

## Evaluate (attempt 2) — OK

## Score
- Gates: ✓ evaluates clean, ✓ non-empty solid
- Scored: 3/3 — 100%
- Tokens: 9,032 in / 350 out / 9,382 total
- Time: 0.0s
- Attempts: 2