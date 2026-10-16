# kernelCAD authoring reference — Recipes

Joinery, hardware and belt recipes, and worked sample scripts.

## Interlocking joinery (flat-pack / laser / CNC)

Tab-and-slot and finger joints in flat stock follow a fixed discipline; getting it backwards produces joints that read as empty slots and carry no load.

- **Through-tabs sit flush or slightly proud — never recessed.** Model the tab to span the FULL thickness of the mating wall; add 0.2–0.5 mm of proud allowance when the face will be sanded or flush-trimmed after assembly. A tab whose end face stops short of the mating surface — even by 0.2 mm — looks like an empty slot and leaves the glue/bearing area undersized.
- **Fit clearance goes on the slot/pocket, not the tab.** Keep the tab at nominal width and thickness; widen the slot by a per-side clearance. Shortening or thinning the tab destroys both the flush face and the joint's reference geometry.
- **Clearance is process-dependent — encode it as a named param (`tabFit`)** so it can be retuned per machine and material without touching geometry:
  - Laser: the beam removes a kerf (~0.1–0.3 mm depending on material and thickness) that already loosens nominal-drawn joints by roughly one kerf width; `tabFit` of 0–0.1 mm per side usually yields a snug press fit.
  - CNC router: `tabFit` 0.1–0.25 mm per side, plus dog-bone / T-bone corner relief at internal slot corners (relief radius ≥ endmill radius) so square tab corners can seat fully.
  - Mating 3D-printed parts: `tabFit` 0.15–0.3 mm per side.
- **Finger joints (box joints):** finger width 1–2× material thickness; finger depth equals the mating wall thickness exactly (plus the same proud allowance) so finger ends finish flush with the outer face; prefer an odd finger count for a symmetric edge.
- Canonical pattern: cookbook snippet `tab-slot-flush-joint` — `lookup_cookbook("tab and slot flush joint")`.

## Hardware, belts, and wood joinery

These are cookbook recipes over existing primitives — call `lookup_cookbook`, do not invent a generator tool.

- Involute spur gear pair (module, tooth counts, 20° pressure angle; center distance `m(z1+z2)/2`) — `lookup_cookbook("involute spur gear pair")`
- ISO metric hex bolt threaded into its nut, M3–M12 table: 60° V-thread via `helix` + `sweep` with `spine: 'helix'`, nut thread via `hole({ thread })` — `lookup_cookbook("ISO metric hex bolt and nut")`
- Countersunk holes seating ISO 10642 flat-head screws flush (`countersink` on `hole` / `holes`) — `lookup_cookbook("countersunk hole flat head screw flush")`
- 20×20 B-type T-slot extrusion, slot 6, plus a corner connector — `lookup_cookbook("20x20 T-slot extrusion slot 6")`
- GT2 timing-belt drive (belt length from pitch diameters, rounded to a 2 mm tooth count) — `lookup_cookbook("GT2 timing belt drive")`
- Wood dado, rabbet, and mortise-and-tenon with fit clearance — `lookup_cookbook("wood dado rabbet mortise")`
- Pipe route through 3D waypoints with a bend radius — `lookup_cookbook("pipe route bend radius")`
- Engineering material grades (`mild-steel` / `aluminum-6061` / `pla` / `petg` / `abs` / `nylon`; aliases `steel` / `aluminum` / `pet`) — one name drives mass, finish, the recorded part material and FEA — `lookup_cookbook("mild-steel aluminum-6061 nylon material mass")`
- Shop-release GT2 rotary actuator (housing + pulleys + shaft/bearing + cover, one script) — `lookup_cookbook("shop-release GT2 rotary actuator")`. Cord and rounded nubs are not tooth meshing; do not USD-export the cylindrical mate.
- Pan/tilt inspection head with a rigid routed service tube and `animationView` — `lookup_cookbook("pan tilt inspection head routed service tube")`. Keep `param()` beside the tracks. The tube is rigid.
- 4-DOF arm release/evidence pack (materials, reach animation, static hold, then BOM/drawing/USD/FEA checklist) — `lookup_cookbook("four DOF release evidence pack")`. Report FEA UNVERIFIED when the solver is absent.
- Shop-release planetary gearbox (machined housing, carrier, cover, named materials, fastened pitch pose) — `lookup_cookbook("shop-release planetary gearbox stage")`. Do not animate tooth mesh or declare a gear-pair transmission.
- Clamshell enclosure release pack (walled shells, clevis spine, `lidDeg` + `animationView`, BOM/drawing/USD checklist) — `lookup_cookbook("clamshell enclosure release pack")`. Keep `param()` beside the track. The gasket-sealed close is outside the limits.
- NEMA shaft/bearing/spur drive stack (plate, motor stand-in, two bearings, involute pair) — `lookup_cookbook("NEMA shaft spur drive stack")`. Geometric mesh only; do not USD-export the cylindrical mates.
- T-slot frame corner with gusset and cap-screw BOM — `lookup_cookbook("T-slot frame corner fastener BOM")`. Shanks are clearance stand-ins, not a swept V-thread.

## Sample

### Parametric bracket with hole

```typescript
const w = param('width', 60, { min: 30, max: 200 });
const h = param('height', 40, { min: 20, max: 120 });
const t = param('thickness', 5, { min: 2, max: 15 });
const holeRadius = param('holeRadius', 4, { min: 1.5, max: 10 });

const base = box(w, h, t);
const hole = cylinder(8, holeRadius).translate(30, 20, -1);
return base.subtract(hole);
```

### Sketch builder + extrude pipeline

```typescript
// Arbitrary 2D profile via path builder, then extruded.
const depth = param('depth', 10, { min: 1, max: 40 });

const profile = path()
  .moveTo(0, 0)
  .lineTo(30, 0)
  .lineTo(30, 20)
  .sagittaArc(15, 30, 5)
  .lineTo(0, 20)
  .close();

return profile.extrude(depth);
```

### Variable-radius blend

```typescript
// Different fillet radii on different edge selections.
const body = box(40, 30, 15);

const topEdges = await selectEdges(body, { face: 'top' });
const bottomEdges = await selectEdges(body, { face: 'bottom' });

return body.fillet([
  { edges: topEdges, radius: 5 },
  { edges: bottomEdges, radius: 1 },
]);
```

### Mirror — symmetric part

```typescript
// Build one half and mirror across the YZ plane.
const half = box(20, 40, 10)
  .subtract(cylinder(10, 6).translate(10, 20, -1))
  .fillet(2);

return half.mirror('yz');
```

### Surfaces → solid (Slice E finishing ops)

Two Coons patches trimmed to a shared edge, sewn into a closed solid, drafted for mold release, then exported as STEP.

```typescript
// Build two complementary 4-boundary patches that share the bottom edge.
const sharedBottom = nurbsCurve([[0, 0, 0], [25, 0, 1], [50, 0, 0]]);
const right   = nurbsCurve([[50, 0, 0], [50, 12, 0.5], [50, 25, 0]]);
const top     = nurbsCurve([[50, 25, 0], [25, 25, 1], [0, 25, 0]]);
const left    = nurbsCurve([[0, 25, 0], [0, 12, 0.5], [0, 0, 0]]);

const bottom2 = nurbsCurve([[0, 0, 0], [25, 0, -1], [50, 0, 0]]);
const right2  = nurbsCurve([[50, 0, 0], [50, 12, -0.5], [50, 25, 0]]);
const top2    = nurbsCurve([[50, 25, 0], [25, 25, -1], [0, 25, 0]]);
const left2   = nurbsCurve([[0, 25, 0], [0, 12, -0.5], [0, 0, 0]]);

const patchA = surfaceFromBoundary([sharedBottom, right, top, left]);
const patchB = surfaceFromBoundary([bottom2, right2, top2, left2]);

// Trim each patch at their shared boundary curve so the sewn edges align.
const trimmedA = patchA.trimTo(sharedBottom);
const trimmedB = patchB.trimTo(sharedBottom);

// Sew into a closed solid (requireClosed catches authoring mistakes early).
const solid = sew([trimmedA, trimmedB], { requireClosed: true });

// Apply draft to one face for mold release.
const molded = solid.draft(3, { face: 'top' });

return molded;
```

Export as STEP after verifying:

```bash
kernelcad evaluate surfaces-to-solid.kcad.ts   # exits 0, no open-shell diagnostic
kernelcad export step surfaces-to-solid.kcad.ts -o out.step
```
