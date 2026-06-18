---
name: kernelcad-patterns
description: Mechanical patterns — linear, circular, grid. Use when replicating a sub-feature (hole, rib, fin, tab, spoke) along an axis, around an axis, or across a 2D grid as a single editable unit.
---

# kernelCAD — mechanical patterns

`Shape.patternLinear` / `.patternCircular` / `.patternGrid` produce a single `FeatureRecord` per call — one editable unit, one row in `inspect({ of: 'features' })`, one undo step. The pattern composes the source feature into N instances; instance 0 is the source position.

```ts
// Linear: 5 fins evenly spaced 10 mm along +X
const fin = box(2, 20, 8);
const heatsink = plate.add(fin).patternLinear({ count: 5, direction: [1, 0, 0], spacing: 10 });

// Circular: 6 spokes around the +Z axis
const spoke = rib.patternCircular({ count: 6, axis: [0, 0, 1] });

// Grid: 4x3 bolt-hole array on a plate
const mountBolt = plate.hole('top', { u: 0, v: 0, diameter: 5, depth: 'through', name: 'mountBolt' });
const drilled = mountBolt.patternGrid({
  x: { count: 4, direction: [1, 0, 0], spacing: 25 },
  y: { count: 3, direction: [0, 1, 0], spacing: 25 },
});
```

## API

```typescript
.patternLinear({ count, direction, spacing }: {
  count: number;                       // integer >= 2
  direction: [number, number, number]; // unit-ish; will be normalized
  spacing: number;                     // non-zero finite mm
}): Shape

.patternCircular({ count, axis, angleDeg? }: {
  count: number;                       // integer >= 2
  axis: [number, number, number];      // rotation axis
  angleDeg?: number;                   // total angle; defaults to 360
}): Shape

.patternGrid({ x, y }: {
  x: { count: number; direction: [number, number, number]; spacing: number };
  y: { count: number; direction: [number, number, number]; spacing: number };
}): Shape
```

## Geometric semantics

Pattern is implemented as **cumulative boolean union of transformed source copies**. Additive features (boxes, ribs, fins, tabs, spokes) pattern cleanly. Patterning a subtractive feature (`hole`, `cutout`) only preserves the per-instance void when adjacent bodies are disjoint — overlapping patterned bodies cause the inner void to be filled by the outer body's solid (boolean-union semantics).

## Addressing patterned face / edge refs

Pattern features are a single editable unit per call. To address an individual instance's face or edge, build a created-ref with the synthetic instance lineage:

```typescript
// Address instance 2's wall (zero-indexed; instance 0 is the source position)
{ kind: 'created', rewriteId: '<sourceFeatureId>_pattern_2', slot: 'wall' }
```

To address all instances together, use the source feature's **name selector** — `'mountBolt.wall'` resolves to every patterned instance's wall in one collective. Use `.name()` on the source feature for stable cross-pattern references.

## MCP introspection

- `add_pattern_feature({ code, target, kind, linear?, circular?, grid?, assign_to? })` — insert a `Shape.patternLinear / .patternCircular / .patternGrid` call before the last top-level return and return modified code plus diagnostics. Composes the call from structured args (validated under the same predicates as the capture proxy). Pattern-instance face refs resolve via the virtual `<sourceId>_pattern_<i>` lineage id on the pattern feature.

## Pattern diagnostic codes

- `feature.pattern.source-not-found` (error) — the pattern source feature was not found. Verify the variable receiving `.patternLinear` / `.patternCircular` / `.patternGrid` is bound from an earlier feature, that the source feature is not suppressed, and that the source FeatureId matches what `inspect({ of: 'features' })` reports.
- `feature.pattern.count-out-of-range` (error) — pattern count must be an integer >= 2. For grid patterns, both `x.count` and `y.count` must be >= 2. If count is a Param, set `{ min: 2 }` on the Param declaration so updates can't lower it below the valid range.

## Verification gates

After authoring a pattern, run before reporting done:

| Gate | Pass criterion |
|------|----------------|
| G-eval | `kernelcad evaluate` exits 0 — no `feature.pattern.*` diagnostics |
| G-count-ge-2 | Every pattern's `count` is an integer >= 2 (grid: both `x.count` and `y.count`). Param-bound counts carry `{ min: 2 }` |
| G-direction-spacing-finite | `direction` is a finite Vec3 (not zero-length); `spacing` is a non-zero finite number |
| G-source-bound | The variable receiving `.patternLinear` / `.patternCircular` / `.patternGrid` is bound from an earlier feature in the same chain; source is not suppressed |
| G-no-overlap | `kernelcad interference` reports zero overlaps between patterned instances; if patterning a subtractive feature, every instance still subtracts the expected void |
| G-instance-ref-resolves | If downstream features reference a specific instance (`<sourceId>_pattern_<i>` or `'<name>.<slot>'`), `inspect({ of: 'features' })` shows the resolved ref before exporting |

## Related skills

- `kernelcad-authoring` — pattern API surface is part of the Shape method surface; this skill goes deeper on semantics and instance-ref addressing.
- `kernelcad-features` — patterning a `hole` / `cutout` follows the boolean-union rule above; collective ref by feature name (`'mountBolt.wall'`) is the canonical way to address every instance.
- `kernelcad-params` — wire `count`, `spacing`, `angleDeg` to editable params; remember `{ min: 2 }` on count params.
- `kernelcad-mcp` — `add_pattern_feature` for agent-driven pattern insertion.
