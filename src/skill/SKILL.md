---
name: kernelcad
description: kernelCAD model authoring guide for `.kcad.ts` scripts — primitives, transforms, booleans, edge features (fillet/chamfer/shell), parameters with units, exports. Use when writing or modifying kernelCAD geometry from a coding agent context.
---

# kernelCAD

Author or modify kernelCAD models in TypeScript. Scripts live in `.kcad.ts` files; the kernelCAD CLI (`kernelcad evaluate <file>` and `kernelcad export stl|step <file> -o <out>`) executes them via an OpenCASCADE WASM kernel.

This skill is the one-shot authoring companion to the kernelCAD MCP server (`kernelcad mcp`). Use this skill to write scripts; use the MCP server when you need to introspect a running model dynamically (volume, edge counts, why a feature failed).

## Coordinate System

- **Z-up**, right-handed.
- All linear dimensions are millimetres.
- All angles are degrees.
- Box: corner-anchored at the origin (spans `[0, x] × [0, y] × [0, z]`). Pass `centered: true` as the fourth argument to anchor at the centroid.
- Cylinder: axis along Z, base at `z=0`, top at `z=h`.
- Sphere: centred at the origin.

## API Surface

### Top-level functions

```typescript
// Parameters with units and bounds. Returned value is a number; the param() call
// also registers a UI slider when the script is run interactively.
param(name: string, defaultValue: number | string, opts: {
  unit: 'mm' | 'in' | 'm' | 'deg' | 'rad' | 'unitless';
  min?: number;
  max?: number;
  description?: string;
}): number;

// Primitives. Each returns a Shape.
box(x: number, y: number, z: number, centered?: boolean): Shape;
cylinder(height: number, radius: number): Shape;
sphere(radius: number): Shape;

// 2D-to-3D. Profiles are constrained in v0.2-alpha:
//   extrudeRect — rectangular profile extruded along Z
//   extrudeCircle — circular profile extruded along Z
//   revolveRect — rectangular profile revolved around Z (offset from axis by offsetX)
// Sketches with arbitrary profiles land in v0.4-alpha.
extrudeRect(width: number, height: number, depth: number): Shape;
extrudeCircle(radius: number, depth: number): Shape;
revolveRect(width: number, height: number, offsetX: number, angleDeg?: number): Shape;
```

### Shape methods (chainable)

```typescript
// Transforms (mutate-then-return-this; chain freely):
.translate(x: number, y: number, z: number): Shape
.rotate(axis: [number, number, number], degrees: number, pivot?: [number, number, number]): Shape
.scale(sx: number, sy?: number, sz?: number): Shape

// Booleans (each returns a NEW Shape that captures a 'boolean' feature record):
.subtract(...others: Shape[]): Shape
.union(...others: Shape[]): Shape
.intersect(...others: Shape[]): Shape

// Edge features (v0.2-alpha):
.fillet(radius: number, opts?: { face?: CanonicalFace }): Shape
.chamfer(distance: number, opts?: { face?: CanonicalFace }): Shape

// Face features (v0.2-alpha):
.shell(thickness: number, opts: { face: CanonicalFace }): Shape  // face REQUIRED
```

`CanonicalFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back'`

## Canonical Face Refs — Critical Constraint

In v0.2-alpha, the `{ face }` option on fillet/chamfer/shell only works on **un-transformed primitives** (raw `box(...)`, `cylinder(...)`, `sphere(...)`). Once you apply any transform (`.translate`, `.rotate`, `.scale`) or a boolean (`.subtract`, `.union`, `.intersect`), the canonical name resolution becomes ambiguous and the lowerer rejects the face filter with `feature.edge-feature.face-ref-not-resolvable`.

**Workaround:** apply the edge feature *before* transforms.

```typescript
// ❌ Fails — canonical face ref on a transformed primitive
return box(20, 20, 20).translate(5, 0, 0).fillet(2, { face: 'top' });

// ✅ Works — fillet first, then translate
return box(20, 20, 20).fillet(2, { face: 'top' }).translate(5, 0, 0);

// ✅ Works on raw primitives:
return box(20, 20, 20).fillet(2, { face: 'top' });

// ✅ Works on boolean results — but no face filter (rounds all edges):
return box(20, 20, 5).subtract(cylinder(10, 4)).fillet(1);
```

Per-primitive canonical face applicability:
- Box: all six (`top` / `bottom` / `left` / `right` / `front` / `back`).
- Cylinder: only `top` and `bottom` (the disc end-caps). Side faces have no canonical name.
- Sphere: none. Sphere with any `{ face }` filter → error.

## Sample Scripts

### Parametric bracket with hole (v0.1 demo)

```typescript
const w = param('Width', 60, { unit: 'mm', min: 30, max: 200 });
const h = param('Height', 40, { unit: 'mm', min: 20, max: 120 });
const t = param('Thickness', 5, { unit: 'mm', min: 2, max: 15 });

const base = box(w, h, t);
const hole = cylinder(t + 2, 4).translate(w / 2, h / 2, -1);
return base.subtract(hole);
```

### Rounded bracket (v0.2-alpha fillet demo)

```typescript
const w = param('Width', 60, { unit: 'mm' });
const h = param('Height', 40, { unit: 'mm' });
const t = param('Thickness', 5, { unit: 'mm' });
const r = param('FilletRadius', 2, { unit: 'mm' });

return box(w, h, t)
  .subtract(cylinder(t + 2, 4).translate(w / 2, h / 2, -1))
  .fillet(r);
```

### Hollow box (v0.2-alpha shell demo)

```typescript
const w = param('Width', 30, { unit: 'mm' });
const h = param('Height', 30, { unit: 'mm' });
const d = param('Depth', 20, { unit: 'mm' });
const t = param('WallThickness', 1.5, { unit: 'mm' });

return box(w, h, d).shell(t, { face: 'top' });
```

## Diagnostic Codes

When the kernel rejects a feature, it emits a `CompilerDiagnostic` with one of these codes. Use `kernelcad evaluate --json <file>` (or the MCP `why_did_this_fail` tool) to read them.

| Code | Meaning |
|---|---|
| `feature.fillet.failed` | OCCT could not apply the fillet. Try a smaller radius — typically less than half of the smallest face dimension. |
| `feature.fillet.no-base` | Fillet has no base shape. Ensure the fillet is chained onto a solid shape. |
| `feature.fillet.no-radius` | The required radius param is missing — supply a positive number. |
| `feature.chamfer.failed` | OCCT could not apply the chamfer. Try a smaller distance. |
| `feature.chamfer.no-base` | Chamfer has no base shape. Ensure the chamfer is chained onto a solid shape. |
| `feature.chamfer.no-distance` | The required distance param is missing — supply a positive number. |
| `feature.shell.failed` | OCCT could not shell the solid. Thickness must be smaller than the shape's minimum thickness. |
| `feature.shell.no-base` | Shell has no base shape. Ensure the shell is chained onto a solid shape. |
| `feature.shell.no-thickness` | The required thickness param is missing — supply a positive number. |
| `feature.edge-feature.face-ref-not-resolvable` | Canonical face refs only work on un-transformed primitives. Apply edge features before transforms. |
| `feature.edge-feature.face-ref-not-applicable` | That canonical face name is not valid for this primitive (e.g. 'left' on a cylinder). |
| `feature.edge-feature.face-ref-not-supported` | Only canonical face refs are supported in v0.2-alpha. Apply fillet/chamfer without a face filter, or use a canonical face name. |
| `feature.face-feature.face-required` | Shell needs a face to remove. Pass `{ face: 'top' }` (or another canonical face). |
| `feature.face-feature.face-ref-not-resolvable` | Canonical face refs only work on un-transformed primitives for shell. Apply shell before transforms. |
| `feature.face-feature.face-ref-not-applicable` | That canonical face is not valid for this primitive for shell (e.g. cylinders only accept top/bottom). |
| `feature.face-feature.face-ref-not-supported` | Only canonical face refs are supported in v0.2-alpha for shell. |
| `recompute.input.missing` | An upstream feature failed or was suppressed. The error cascaded. Walk upstream (use the MCP `why_did_this_fail` tool) to find the root cause. |
| `recompute.lowering.exception` | An exception was raised during OCCT lowering. Check the diagnostic message for the OCCT error. |
| `cli.script.exception` | Your script raised a JS exception during execution. The diagnostic message contains the JS error. |
| `cli.file.read` | kernelCAD could not read the script file at that path. |
| `cli.no-input` | No input provided to the CLI command. Pass either a file path or inline code. |
| `cli.export.exception` | An exception occurred during export. Check the diagnostic message for details. |
| `export.no-shape` | The script did not return a shape. Ensure your script ends with `return <shape>`. |
| `export.shape-not-lowered` | The returned shape could not be lowered to OCCT. Check for upstream errors in the feature tree. |

## CLI Commands

```bash
# Run a script and report features + diagnostics
kernelcad evaluate path/to/script.kcad.ts

# Same, but JSON output (machine-readable)
kernelcad evaluate path/to/script.kcad.ts --json

# Export to STL or STEP
kernelcad export stl path/to/script.kcad.ts -o /tmp/out.stl
kernelcad export step path/to/script.kcad.ts -o /tmp/out.step

# Run the MCP server (stdio transport)
kernelcad mcp
```

## MCP Companion (introspection)

When you have `kernelcad mcp` available, use the MCP tools for dynamic introspection rather than re-running the CLI. The MCP server exposes 6 tools:

- `evaluate_script({ file? code? })` — pass/fail + featureCount + diagnostics
- `list_features({ file? code? })` — array of feature summaries (kind/id/params/inputs)
- `get_shape_info({ file? code?, feature_id? })` — volume/surfaceArea/bbox of a feature (default: last)
- `list_topology({ file? code?, feature_id? })` — canonical face names + edge count
- `get_edges_of({ file? code?, feature_id?, face_name })` — boundary edges of a face (centroid, length, isClosed)
- `why_did_this_fail({ file? code?, feature_id? })` — focused diagnostics + upstream chain + human-readable hints

## Out of Scope (v0.2-alpha)

These return errors today; do not generate code that uses them:

- 2D sketches (`sketch.rect`, `sketch.path`, `sketch.polygon`) — v0.4-alpha
- Tracked face/edge refs (only canonical refs work) — v0.2-full
- Asymmetric chamfer (only symmetric 45° supported) — v0.2-beta
- Per-edge variable radii (only single radius per fillet) — v0.2-full
- Hole / cut / draft as distinct features (use `subtract(cylinder)` etc.) — v0.3
- Curves / lofts / sweeps — v0.7
- Assemblies / joints — v0.6
- Output extras (BOM, dimensions, BREP, multi-view PDF) — v0.8

## Conventions

- Always declare params at the top of the script with units; the kernel evaluates them and surfaces them as live sliders to the studio.
- Prefer `subtract(cylinder)` for through-holes until v0.3 ships a dedicated `hole` feature.
- Apply transforms AFTER edge/face features when the face filter matters; transforms commute with everything except face-ref resolution.
- Always `return` a single shape from the top of the script — the kernelCAD CLI exports whatever you return.
