---
name: kernelcad-sheet-metal
description: Folded sheet-metal parts — sheetMetal(profile, opts), .bend(edge, angle, radius), .flattenPattern(). Use when building L-brackets, U-channels, service panels, or any part fabricated from a flat blank + folds.
---

# kernelCAD — sheet metal

Build folded sheet-metal parts (L-brackets, U-channels, service panels) from a closed Sketch + thickness + K-factor. Bend along a linear axis line; recover the flat blank as a `Region` for laser / CNC consumption.

```typescript
// L-bracket: 100 x 60 x 2 mm, one 90 degree fold along x=50.
const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
const bracket = blank.bend({ atX: 50 }, 90, 3);
return bracket;

// Recover the flat blank as a Region.
const flat = bracket.flattenPattern();
console.log(flat.outer);     // [[0,0], [100,0], [100,60], [0,60]]
console.log(flat.bendLines); // [{ start: [50,0], end: [50,60], angle: 90, radius: 3, ordinal: 0 }]
```

## API

```typescript
// Top-level constructor — captures kind:sheetMetal record.
sheetMetal(profile: Sketch, opts: {
  thickness: Editable<number>;   // mm, > 0
  kFactor: Editable<number>;     // unitless, in [0, 1]
  faceLabels?: FaceLabelsMap;
}): Shape;

// Shape methods — chain on a sheetMetal-rooted Shape.
shape.bend(
  edgeRef: EdgeSelector | string,  // slice-1: { atX: n } | { atY: n } | { face: 'top' }
  angle: Editable<number>,         // degrees, signed (positive = fold +normal)
  radius: Editable<number>,        // mm, inner bend radius
): Shape;

shape.flattenPattern(): Region;    // derived view — no FeatureRecord
```

## Bend-allowance math (K-factor approximation)

```
BA = (pi * |angle_deg| / 180) * (kFactor * thickness + radius)
```

- `BA` = developed length of the neutral axis through the bend arc.
- `kFactor` = neutral-axis offset ratio. Typical values: 0.33-0.45 (mild steel / aluminum).
- Slice 1 supports the K-factor formula only.

## How a bend folds

- The bend line is in FLAT-BLANK coordinates for every bend of a chain:
  `.bend({ atX: 25 }, 90, 2).bend({ atX: 75 }, 90, 2)` is a U-channel, even
  though the second line has moved by the time it folds.
- The strip of width `BA` centred on the line becomes the arc (inner radius =
  `radius`); the flange beyond it keeps its flat length, so the flat pattern
  is exactly the blank (flange lengths + bend allowances).
- The SHORTER side of the blank across the line folds (a tie folds the +X /
  +Y side). A web with a bend near each end stays on the bench.
- Holes and cutouts drilled in the flat blank before `.bend()` ride along
  with their flange: `sheetMetal(...).holes({ byNormal: 'Z' }, ...).bend(...)`.
- Parallel bend lines whose zones overlap fail with `feature.invalid-args`.

## Slice-1 limits

- Bend axis derived from `{ atX }` / `{ atY }` EdgeQuery or `{ face: 'top' }`. Other selectors emit `feature.bend.edge-not-linear`.
- `radius >= 0.5 * thickness` recommended; tighter bends emit `feature.kernel-failed`.
- `flattenPattern()` supports at most 2 bends in the chain; 3+ emits `feature.flattenPattern.multi-bend-unsupported`.
- Sketch profiles must be polylines (`path().moveTo / lineTo / close`). Arcs in the profile are not supported by `flattenPattern()` in slice 1.
- A hole that crosses the bend zone loses the part of it inside the zone (the arc is the sheet section at the zone start, revolved). Keep holes `>= BA/2 + radius` from the line.
- Perpendicular bends (`atX` and `atY` on one blank, e.g. a four-sided tray) are not modelled with corner reliefs yet.

## MCP introspection

- `flatten_pattern` — returns the unfolded `Region` as JSON (outer ring + bend lines + holes).
- `inspect({ of: 'bend-table' })` — lists every bend with its K-factor bend allowance, axis line, and parent `sheetMetal` opts.

## Sheet-metal diagnostic codes

- `feature.sheetMetal.kfactor-invalid` (error) — `kFactor` not in `[0, 1]` or non-finite. Hint: pass a value in `[0, 1]`; typical 0.33-0.45.
- `feature.bend.edge-not-linear` (error) — resolved bend axis cannot be derived from the selector. Hint: pick a straight perimeter edge; slice-1 supports `{ atX: <n> }`, `{ atY: <n> }`, or `{ face: 'top' }`.
- `feature.flattenPattern.multi-bend-unsupported` (error) — chain has 3+ bends. Hint: flatten an upstream Shape with `<= 2` bends, or wait for slice 2.

## Verification gates

After authoring a sheet-metal part, run before reporting done:

| Gate | Pass criterion |
|------|----------------|
| G-eval | `kernelcad evaluate` exits 0 — no `feature.sheetMetal.*` / `feature.bend.*` / `feature.flattenPattern.*` diagnostics |
| G-kfactor-valid | `kFactor` is a finite number in `[0, 1]`; pick 0.33-0.45 for mild steel / aluminum unless you have a measured value |
| G-radius-vs-thickness | Inner bend radius `>= 0.5 * thickness`; tighter bends fail and emit `feature.kernel-failed` |
| G-bend-edge-linear | Every `.bend(...)` selector resolves to a straight edge (slice 1: `{ atX }`, `{ atY }`, or `{ face: 'top' }`) |
| G-bend-table-exists | `inspect({ of: 'bend-table' })` returns one entry per `.bend(...)` call with non-negative bend allowance and a finite axis line |
| G-flatten-roundtrip | `shape.flattenPattern()` produces a `Region` whose `outer` polyline area equals the source profile area within `1e-6` (chain has <= 2 bends in slice 1) |
| G-flatten-bend-count | `flattenPattern()` chains have at most 2 bends — 3+ emits `feature.flattenPattern.multi-bend-unsupported` |
| G-profile-polyline | Sketch profile uses only `moveTo` / `lineTo` / `close` — no arcs (slice 1) |

## Mounting sheet on a frame

A sheet (flat panel or bent part) that sits on tubes or a frame touches them: put its underside at the frame top (`z = tubeHeight` for tubes on `z = 0`), not a few mm above. If sheet and frame are fused with `union()`, `evaluate_script` fails with `union.disconnected` when the sheet floats (the message gives the gap) and `union.member-overlap` when members finished with the same material share more than 1 mm³. Prefer `assembly().part('sheet', ...)` + one part per frame member when they are separate BOM lines; recipe: `welded-tube-frame-tray`.

## Related skills

- `kernelcad-authoring` — `path()` + `Sketch` shape this skill operates on; rotate / translate the bracket after folding.
- `kernelcad-features` — fillet / chamfer / hole apply to the folded result, or drill the flat blank before `.bend()`.
- `kernelcad-params` — `thickness`, `kFactor`, `angle`, `radius` all accept `Editable<number>`; wire to params for fab-iteration.
- `kernelcad-mcp` — `flatten_pattern` and `inspect({ of: 'bend-table' })` are the inspection surface for downstream CAM / nesting tools.
