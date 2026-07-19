---
name: render-inspect
description: Interpret diagnostic hints from kernelcad evaluate during a reference reconstruction. Which hints mean "missing feature", which mean "wrong arg", which mean "illegal geometry". Cross-references kernelcad-features for feature details.
---

# render-inspect

## Purpose

`kernelcad evaluate` returns `diagnostics[]`. Each entry carries `code`,
`message`, `severity`, and `hint`. This sub-skill is a quick lookup: given a
diagnostic code seen during a from-reference build, what is the most likely
cause and what is the fix.

Do NOT re-derive this from the code or message alone — read the `hint` field
first. It is a one-sentence imperative. This sub-skill is for when the hint is
not enough.

## Categories of diagnostics in from-reference builds

### 1. Missing feature — the referenced operation does not exist yet

These diagnostics mean a feature the model depends on was not authored or was
accidentally removed:

| Code | Typical cause in from-reference | Fix |
|------|---------------------------------|-----|
| `recompute.input.missing` | A feature's upstream shape (e.g., the blockout primitive) was renamed or removed. | Call `why_did_this_fail` MCP tool to walk the chain. Restore or rename the upstream shape. |
| `feature.face-ref.removed` | A boolean removed a face that a downstream fillet/shell still references. | Reorder: apply the fillet before the boolean. Or switch to a query-based selector. |
| `feature.face-ref.ambiguous-after-split` | A boolean split a face that was targeted by name. | Apply the feature before the splitting boolean, or use `await selectEdges(shape, query)` to target the specific post-split face. |

### 2. Wrong argument — the operation exists but the input is out of range

| Code | Typical cause in from-reference | Fix |
|------|---------------------------------|-----|
| `feature.invalid-args` | Fillet radius exceeds the local edge geometry (too large for a thin frame arm). | Reduce the fillet radius. Use the variable-radius form to apply a smaller radius on narrow edges. |
| `feature.invalid-args` (scale) | `.scale([sx, sy, sz])` received a zero or negative factor (e.g., a param reached 0). | Add a `min: 0.001` guard on the controlling param. |
| `feature.hole.no-target-face` | The hole's entry face is correct but the bore axis does not intersect a solid body. | Check that the target body extends along the bore axis past the hole entry depth. |

### 3. Geometry illegal — the kernel rejected the result

| Code | Typical cause in from-reference | Fix |
|------|---------------------------------|-----|
| `recompute.failed` | Boolean produced an empty or degenerate solid (two bodies that barely touch produce an ambiguous boolean). | Add a small epsilon offset (0.01 mm) to ensure the subtracted cylinder fully penetrates the target body. |
| `recompute.failed` (shell) | `.shell()` on a body with a very thin wall produced zero-thickness faces. | Increase wall thickness, or use a simpler boolean subtraction approach. |

### 4. Warnings — non-blocking, but read them

| Code | Typical cause | Action |
|------|--------------|--------|
| `feature.created-ref.fallback-used` | A downstream feature (fillet of hole rim) resolved via geometry snapshot after topology was lost. | Review the chain — the model still evaluates clean, but the ref is fragile. Re-anchor it with a `.name()` call on the upstream feature if you plan to keep editing. |

## Using why_did_this_fail

When `recompute.input.missing` appears, the first call should be
`why_did_this_fail` via MCP — not a manual chain trace. It returns the
topological order of all upstream failures with their hints:

```json
{
  "chain": [
    { "id": "f1", "kind": "boolean", "health": "failed",
      "diagnostics": [{ "code": "recompute.failed", "hint": "..." }] },
    { "id": "f2", "kind": "fillet", "health": "input-missing",
      "diagnostics": [{ "code": "recompute.input.missing", "hint": "..." }] }
  ]
}
```

Fix the root of the chain (`f1` in this example), not the leaf.

## Render artefacts that are NOT diagnostics

These appear in the rendered image, not in `evaluate` output:

| Artefact | Cause | Fix |
|----------|-------|-----|
| Flat grey surface (no gloss) | No finish/material applied, or applied after a boolean (no-op). | Apply `.finish(name)` (or `.material()` for raw PBR) to each leaf part BEFORE it enters a boolean. |
| Floating sub-component | The part was not translated into contact with its parent. | Re-read the brief's hidden-side inference; verify Y-layer ordering. |
| Clipped model on the right | `kernelcad render` run without `--width 1920 --height 1080`. | Re-run with the correct resolution flag. |
| Black render / all-black PNG | Frame sampling gate: output file is valid but content is near-black. | Check that the camera direction is correct and the model is not inside a solid. |

## Cross-reference

- For feature-specific diagnostics (fillet, chamfer, shell, hole, cutout) see
  `kernelcad-features`.
- For NURBS surface diagnostics see `kernelcad-nurbs`.
- For assembly mate diagnostics see `kernelcad-mcp` (`review_cad` repairContext).
