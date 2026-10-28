# SolidCraft oracle ledger

**Gate:** PASS. Unexpected failures: 0. Known failures executed: 0; still failing 0; cleared for promotion 0.

SolidCraft (https://github.com/tangency-labs/solidcraft) commit `7a6c884418698e9c9fb0e6f97b9b847998c58c49` (2026-10-27 17:16:40 -0400). SolidCraft is Apache-2.0 OR MIT. This vendored oracle is used under the Apache-2.0 terms. The licence text is assets/reference-parts/solidcraft/LICENSE-APACHE.

Volume and surface area use SolidCraft's default relative tolerance of 1e-3. Bounding box and centre of mass use the looser of 0.05 mm (the reference-parts scorecard floor; an exact OCCT bbox on a cylinder is about 0.024 mm) and 1e-3 of the expected bbox diagonal (SolidCraft's absolute rule).

The table lists every vendored case. PENDING rows have no kernelCAD source and are not failures. NOT RUN rows are implemented outside this PR tier; the nightly job builds them. Measurements below are from the PR tier only, so this file does not lock a pass-count baseline and does not change when the nightly job runs.

Regenerate with `npm run solidcraft-ledger:regenerate`. PR CI runs `npm run test:solidcraft-ledger`. The full implemented set runs with `npm run test:solidcraft-ledger:all`. Face counts are kept in the vendored expected.json files and are not gated.

To bump the pin, follow `assets/reference-parts/solidcraft/SOURCE.txt`.

| Case | Name | CI | Declared | Δ volume | Δ area | Δ bbox | Δ CoM | Result |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| 01-box | Box extrude | pr | pass | +0.0000% | +0.0000% | 0.000 mm | 0.000 mm | PASS |
| 02-cylinder | Cylinder | pr | pass | +0.0000% | -0.0000% | 0.024 mm | 0.000 mm | PASS |
| 03-box-through-hole | Box with through hole | pr | pass | +0.0000% | +0.0000% | 0.000 mm | 0.000 mm | PASS |
| 04-revolve-vase | Revolved vase profile | nightly | pending | — | — | — | — | PENDING |
| 05-taper-extrude | Tapered extrude | nightly | pending | — | — | — | — | PENDING |
| 06-symmetric-extrude | Symmetric extrude | pr | pass | +0.0000% | +0.0000% | 0.000 mm | 0.000 mm | PASS |
| 07-fillet-all-edges | Box with all edges filleted | pr | pass | +0.0000% | -0.0000% | 0.000 mm | 0.000 mm | PASS |
| 08-chamfer | Box with top edges chamfered | pr | pass | -0.0000% | -0.0000% | 0.000 mm | 0.000 mm | PASS |
| 09-shell | Shelled open box | pr | pass | -0.0000% | +0.0000% | 0.000 mm | 0.000 mm | PASS |
| 10-rect-pattern-holes | Rectangular pattern of holes | pr | pass | +0.0000% | +0.0000% | 0.000 mm | 0.000 mm | PASS |
| 11-circular-pattern-flange | Flange with circular hole pattern | pr | pass | +0.0000% | +0.0000% | 0.000 mm | 0.000 mm | PASS |
| 12-mirror-feature | Mirror feature | pr | pass | +0.0000% | +0.0000% | 0.000 mm | 0.000 mm | PASS |
| 13-combine-join | Boolean union | pr | pass | +0.0000% | +0.0000% | 0.000 mm | 0.000 mm | PASS |
| 14-combine-cut | Boolean subtract | pr | pass | +0.0000% | -0.0000% | 0.000 mm | 0.000 mm | PASS |
| 15-combine-intersect | Boolean intersect | pr | pass | -0.0000% | -0.0000% | 0.000 mm | 0.000 mm | PASS |
| 16-sweep | Sweep along path | nightly | pending | — | — | — | — | PENDING |
| 17-loft | Loft square to circle | nightly | pending | — | — | — | — | PENDING |
| 18-hole-features | Hole features (counterbore, countersink, blind drilled) | nightly | pending | — | — | — | — | PENDING |
| 19-l-bracket-constrained | Constrained L-bracket sketch extruded | pr | pass | +0.0000% | +0.0000% | 0.000 mm | 0.000 mm | PASS |
| 20-slot-constrained | Constrained slot extruded | pr | pass | +0.0000% | +0.0000% | 0.017 mm | 0.000 mm | PASS |
| 21-draft | Draft side faces | nightly | pending | — | — | — | — | PENDING |
| 22-split-body | Split body by angled plane | nightly | pending | — | — | — | — | PENDING |
| 23-bracket-multifeature | Multi-feature bracket | nightly | pending | — | — | — | — | PENDING |
| 24-user-parameters | Parametric block driven by user parameters | pr | pass | +0.0000% | +0.0000% | 0.000 mm | 0.000 mm | PASS |
| 25-sketch-triangle | Sketch solver: triangle with lengths and angle | nightly | pending | — | — | — | — | PENDING |
| 26-sketch-belt | Sketch solver: tangent lines between circles | nightly | pending | — | — | — | — | PENDING |
| 27-sketch-trapezoid | Sketch solver: parallel/perpendicular/midpoint/symmetry | nightly | pending | — | — | — | — | PENDING |
| 28-blind-pocket-fillets | Blind pocket with filleted corners | nightly | pending | — | — | — | — | PENDING |
| 29-two-sided-and-partial-revolve | Two-sided extrude + partial revolve cut | nightly | pending | — | — | — | — | PENDING |
| 30-fillet-after-shell | Fillets after shell | nightly | pending | — | — | — | — | PENDING |
| 31-fillet-l-all-edges | All-edge fillet on an L block | nightly | pending | — | — | — | — | PENDING |
| 32-boss-plate-fillets | Boss on plate: base and top fillets | nightly | pending | — | — | — | — | PENDING |
| 33-fillet-tangent-chain | Fillet chain across tangent faces | nightly | pending | — | — | — | — | PENDING |
| 34-chamfer-then-fillet | Chamfer then fillet | nightly | pending | — | — | — | — | PENDING |
| 35-fillet-curved-curved | Fillet between two cylinders | nightly | pending | — | — | — | — | PENDING |
| 36-corner-blend-two-radii | Corner blends with two radii | nightly | pending | — | — | — | — | PENDING |
| 37-pyramid-apex-blend | Pyramid apex: 4-edge corner blend | nightly | pending | — | — | — | — | PENDING |
| 38-coincident-cylinders | Union of coaxial equal cylinders | pr | pass | +0.0000% | +0.0000% | 0.024 mm | 0.000 mm | PASS |
| 39-tee-pipe | Tee pipe (cylinder through cylinder) | nightly | pending | — | — | — | — | PENDING |
| 40-box-sphere-torus | Box + sphere - torus | nightly | pending | — | — | — | — | PENDING |
| 41-tube-radial-holes | Many small holes in a curved wall | nightly | pending | — | — | — | — | PENDING |
| 42-overlapping-patterns | Overlapping hole patterns | nightly | pending | — | — | — | — | PENDING |
| 43-cut-splits-body | Cut that splits a body in two | nightly | pending | — | — | — | — | PENDING |
| 44-shell-l-bracket | Shelled L block | nightly | pending | — | — | — | — | PENDING |
| 45-shell-boss-plate | Shelled boss-on-plate | nightly | pending | — | — | — | — | PENDING |
| 46-shell-two-open-faces | Shell with two open faces | nightly | pending | — | — | — | — | PENDING |
| 47-draft-curved-pocket | Draft on an obround pocket | nightly | pending | — | — | — | — | PENDING |
| 48-pulley | Grooved pulley | nightly | pending | — | — | — | — | PENDING |
| 49-helical-sweep | Helical sweep (spline helix) | nightly | pending | — | — | — | — | PENDING |
| 50-sweep-tight-bend | Sweep with a bend radius equal to the profile radius | nightly | pending | — | — | — | — | PENDING |
| 51-loft-rect-circle-offset | Skewed loft rectangle to circle | nightly | pending | — | — | — | — | PENDING |
| 52-circular-pattern-fillet | Circular pattern of boss + fillet | nightly | pending | — | — | — | — | PENDING |
| 53-path-pattern | Pattern along a path | nightly | pending | — | — | — | — | PENDING |
| 54-mirror-body-fillets | Mirror a filleted body | nightly | pending | — | — | — | — | PENDING |
| 55-tapped-hole-cosmetic | Tapped hole with cosmetic thread | nightly | pending | — | — | — | — | PENDING |
| 56-holes-on-curved-face | Holes on a cylindrical face | nightly | pending | — | — | — | — | PENDING |
| 57-hole-pattern-sketch-points | Counterbore holes from sketch points | nightly | pending | — | — | — | — | PENDING |
| 58-phone-stand | Phone stand | nightly | pending | — | — | — | — | PENDING |
| 59-enclosure-base | Enclosure base with bosses and ribs | nightly | pending | — | — | — | — | PENDING |
| 60-pipe-flange | Weld-neck pipe flange | nightly | pending | — | — | — | — | PENDING |
| 61-shaft-keyway | Stepped shaft with keyway and chamfers | nightly | pending | — | — | — | — | PENDING |
| 62-heat-sink | Heat sink with 15 fins | pr | pass | -0.0000% | +0.0000% | 0.000 mm | 0.000 mm | PASS |
| 63-hinge-knuckle | Hinge leaf with knuckles | nightly | pending | — | — | — | — | PENDING |
| 64-sketch-tangent-arc-chain | Sketch solver: tangent arc chain | nightly | pending | — | — | — | — | PENDING |
| 65-sketch-gear-tooth | Sketch solver: gear-tooth sector | nightly | pending | — | — | — | — | PENDING |
| 66-sketch-linkage | Sketch solver: symmetric link | nightly | pending | — | — | — | — | PENDING |
| 67-sm-base-flange | Sheet metal: base flange | nightly | pending | — | — | — | — | PENDING |
| 68-sm-edge-flange | Sheet metal: one edge flange | nightly | pending | — | — | — | — | PENDING |
| 69-sm-tray | Sheet metal: tray (4 flanges, corner reliefs) | nightly | pending | — | — | — | — | PENDING |
| 70-sm-flange-45 | Sheet metal: 45 deg flange | nightly | pending | — | — | — | — | PENDING |
| 71-sm-custom-rule | Sheet metal: custom rule (t=1.5, K=0.33, R=3) | nightly | pending | — | — | — | — | PENDING |
| 72-sm-contour-flange | Sheet metal: contour flange | nightly | pending | — | — | — | — | PENDING |
| 73-sm-hem | Sheet metal: flat hem | nightly | pending | — | — | — | — | PENDING |
| 74-sm-unfold-refold | Sheet metal: unfold, cut across bend, refold | nightly | pending | — | — | — | — | PENDING |
| 75-sm-bracket-holes | Sheet metal: bracket with holes for DXF | nightly | pending | — | — | — | — | PENDING |
| 76-sm-thickness-variant | Sheet metal: thickness change | nightly | pending | — | — | — | — | PENDING |
| 77-fillet-variable-linear | Variable fillet, linear radius | nightly | pending | — | — | — | — | PENDING |
| 78-fillet-variable-to-zero | Variable fillet closing at a corner | nightly | pending | — | — | — | — | PENDING |
| 79-fillet-chord-length | Chord-length fillet | nightly | pending | — | — | — | — | PENDING |
| 80-fillet-taper-to-fit | Fillet tapered to the room along its edge | nightly | pending | — | — | — | — | PENDING |
| 81-fillet-spline-radius | Fillet with a B-spline radius | nightly | pending | — | — | — | — | PENDING |
| 82-thin-extrude-frame | Thin extrude frame | nightly | pending | — | — | — | — | PENDING |
| 83-boundary-loop-thicken | Boundary surface through a loop, thickened | nightly | pending | — | — | — | — | PENDING |

## Known failures

None declared.
