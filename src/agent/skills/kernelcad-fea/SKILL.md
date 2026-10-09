---
name: kernelcad-fea
description: Answer "will this part hold this load?" with solver evidence — declare a linear-static structural study with shape.feaStudy({ material, fixed, loads, minSafetyFactor? }), then run it with run_fea for peak von Mises stress, peak displacement, minimum safety factor against yield, named hot-spot regions, mesh-trust flags and stress-heatmap PNGs. A declared minSafetyFactor turns the study into a gate that fails evaluate_script. Use when sizing a bracket, mount, tab, clevis or any load-bearing part, when a load-capacity check reported beam-not-applicable, or before committing to a wall thickness or material grade.
---

# kernelCAD — structural FEA

Declare the study in the model, run the solver, read the evidence.

```typescript
const bracket = box(8, 40, 90).union(box(90, 40, 8)).fillet(4, { parallel: [0, 1, 0], concave: true });

bracket.feaStudy({
  material: 'aluminum-6061',
  fixed: { atX: 0 },                                        // bolted to the wall
  loads: [{ faces: { atZ: 8 }, force: [0, 0, -400] }],      // 400 N total, downward
  meshSize: 4,
  minSafetyFactor: 2,                                        // makes it a GATE
});

return bracket;
```

```
run_fea({ file: 'bracket.kcad.ts', output_dir: '/tmp/bracket-fea' })
// → { ok: true, summary: { minSafetyFactor: 5.43, maxVonMisesMPa: 49.70,
//     hotSpots: [{ region: '@kc[fillet_1/face/f7]', ... }],
//     trust: { meshTrusted: false, reasons: [...] },
//     refinement: { passes: [4 mm: 42.5 MPa, 2.62 mm: 46.3 MPa, 1.91 mm: 49.7 MPa],
//                   converged: false, stoppedBy: 'max-passes' },
//     governingField: 'away-from-supports' },
//     images: ['.../heatmap/iso.png', '.../heatmap/front.png'] }
```

## Prerequisite: the solver toolchain

FEA shells out to two external, open-source programs. Neither is bundled.

```bash
sudo apt-get install -y calculix-ccx          # the ccx solver
python3 -m venv .fea-venv && .fea-venv/bin/pip install gmsh==4.15.2   # the mesher
```

Check before you design around it: `fea_summary({})` reports
`toolchain.available` plus the install hint. Override discovery with
`KERNELCAD_CCX` and `KERNELCAD_FEA_PYTHON`. If apt has no `calculix-ccx`
package, a container works equally well — mount the job directory and run
`ccx` inside it, then point `KERNELCAD_CCX` at a wrapper script that does so:

```bash
#!/bin/sh
exec docker run --rm -v "$PWD:/work" -w /work <ccx-image> ccx "$@"
```

**A missing toolchain is never a pass.** `run_fea` and the gate both fail with
`fea.solver.unavailable`.

## Authoring the study

`shape.feaStudy(spec)` registers a declaration bound to that shape. It returns
a handle, not a Shape — it is not part of the geometry chain.

| Field | Meaning |
| --- | --- |
| `material` | A grade name, or explicit `{ E, nu, yield }` in MPa / – / MPa. |
| `fixed` | Faces held rigid (all 3 translations). A `FaceQuery` or a `@kc[...]` ref. |
| `loads[]` | `{ faces, force: [Fx, Fy, Fz], name? }`. `force` is the TOTAL in newtons over those faces, applied as a uniform traction (area-weighted consistent nodal loads), not per node. |
| `meshSize` | Target element size, mm. Default: bounding-box diagonal / 20. |
| `minSafetyFactor` | Declaring it turns the study into an enforcement gate. |
| `name` | Study name; `run_fea({ study })` selects by it. Default `study`. |

Selectors are the same vocabulary as the rest of the API — `{ atX: 0 }`,
`{ atZ: wall }` (params stay symbolic and resolve at run time), or a
`@kc[...]` ref taken from `inspect({ of: 'faces' })`. Call that first when you
are not sure which face you mean.

### Materials

| Grade | E (MPa) | nu | yield (MPa) |
| --- | --- | --- | --- |
| `mild-steel` | 200000 | 0.29 | 250 |
| `aluminum-6061` | 70000 | 0.33 | 270 |
| `pla` | 3500 | 0.36 | 50 |
| `petg` | 2700 | 0.40 | 55 |
| `abs` | 2300 | 0.35 | 40 |
| `nylon` | 1700 | 0.39 | 45 |

`fea_summary({})` returns this table live. These are the same grade names
`arm.part({ material })` and `inspect({ of: 'mass', material })` take (one
material registry), and the bulk aliases `steel`, `aluminum` / `aluminium`
and `pet` resolve to `mild-steel`, `aluminum-6061` and `petg`. An unknown
grade is refused with the valid list — it is never guessed. For a measured
lot, pass `{ E, nu, yield }` directly.

## Reading the result

- **`minSafetyFactor`** = material yield / peak von Mises. Under 1 means the
  part yields at this load.
- **Support zone.** A `fixed` face is clamped rigidly, and the stress at the
  edge of a rigid clamp is singular: it climbs as the mesh is refined and real
  bolt or washer clamping spreads it. So `maxVonMisesMPa`, `minSafetyFactor`,
  `hotSpots` and the trust estimate are taken AWAY from the fixed-face edges
  (`governingField: 'away-from-supports'`). The excluded zone reaches 0.4 x
  the local wall thickness from each edge (`supportZoneRadiusMm`), the first
  read-out point of the structural hot-spot method. The raw clamp-edge value is
  kept as `peakAtSupportMPa` / `peakAtSupportAt` / `peakAtSupportRegion`, and
  `fea.stress.support-singularity` warns when it is higher than the governing
  peak. When the zone covers more than half the part, nothing is excluded
  (`governingField: 'all-nodes'`) and the warning says so. If the bolt region
  itself is the question, model the washer or head contact as a load face and
  fix the far side instead.
- **`hotSpots[]`** — the peak per region, named by `@kc[...]` face ref, sorted
  worst first. This is where to add material. The peak is very often at a
  fillet or a corner, not at the loaded face.
- **`trust.meshTrusted`** — `false` means the *stress* number is mesh-limited
  (inverted elements, >1% poor elements, or CalculiX's own nodal stress-error
  estimate above 25% in the high-stress region, where von Mises is at least
  half the governing peak). Displacement converges much faster and stays usable.
  `run_fea` and verify already refine the mesh for you (next section);
  when the result is still untrusted, `summary.refinement.stoppedBy` says why.
- **`refinement`** — every pass of the automatic refinement, coarsest
  first: `{ meshSizeMm, elementCount, governingPeakMPa,
  maxStressErrorPercent, meshTrusted, region, peakChangePercent }`, plus
  `converged` and `stoppedBy`. The summary's own numbers are the last pass.
- **`equilibriumResidual`** — `|reaction + applied| / |applied|`. Near 1e-12 is
  healthy; anything large means the load or the constraint did not land where
  the study said, and the safety factor is meaningless.
- **`images` + `legend`** — banded stress heatmap PNGs from the same offline
  render pipeline as `render_preview`. The bands QUANTIZE the field (8 steps);
  the numbers in `summary` are the continuous truth. Use the picture to locate
  the problem, the numbers to measure it.

## Automatic mesh refinement

`run_fea` and verify mode 'fea' refine the mesh themselves, so you do not
hand-tune `meshSize` to get a trusted stress. Pass `refine: false` to solve
exactly once at the study's (or mesh_size's) element size. The stress-graded
infill export does not refine unless asked (`infill.refine: true`). The
rules:

1. **Trigger.** Only when the stress is untrusted because CalculiX's error
   estimate in the high-stress region is above 25 %. Untrusted for element
   shape alone (inverted elements, >1 % slivers) does not refine: slivers
   come from the geometry, and smaller elements make more of them. Fix the
   thin feature instead (`stoppedBy: 'quality-limited'`).
2. **Step.** The next element size is the current one x (20 / error)^(1/p),
   kept between x0.5 and x0.8. p is 1 for the first step, then the rate the
   error estimate actually fell over the last step, held to 1-2 (at fillets
   it falls slowly, and extrapolating that would ask for a huge mesh).
3. **Budgets.** The next element count is predicted as N x (h_old/h_new)^3
   and its time as the last pass's x (N_new/N_old)^1.5. The step shrinks to
   fit 90 % of `KERNELCAD_FEA_MAX_ELEMENTS` (default 400000, also the hard
   ceiling for any mesh) and the time left of `KERNELCAD_FEA_REFINE_TIME_MS`
   (default 300000 ms for all passes). If no step of x0.8 or finer fits,
   refinement stops (`'element-budget'` / `'time-budget'`). A finer pass
   that fails (memory kill, timeout) is dropped and the previous one stands
   (`'pass-failed'`). At most 2 passes after the first (`'max-passes'`).
4. **Convergence.** If the governing peak moved less than 5 % over the last
   step, its region already carried that peak (within 5 %) on the coarser
   mesh, and no elements are bad, the result is
   trusted even with the error estimate still above 25 %
   (`trust.basis: 'peak-convergence'`, `stoppedBy: 'converged'`). The step
   is at least a x0.8 refinement, so by Richardson extrapolation the error
   left in the finer peak is at most about 4 x the change (first-order
   convergence), 20 %, and about 2.3 x (12 %) at a x0.7 step: inside the
   25 % the estimator is held to. It cannot rule out two coarse meshes
   agreeing by accident, which is why it also checks the region. A
   singular peak (a sharp inside corner away from the supports) keeps
   growing and never meets it.

When a budget or a failed pass stops refinement before the stress is
trusted, `fea.mesh.refine-stopped` lists every pass; the next step is a
larger budget, a local toolchain with more memory, or reading the stress as
mesh-limited with a bigger margin. `fea.mesh.quality-low` (retry with a
smaller meshSize) now appears only when refinement was skipped (refine
false, the gate, element quality) or used all its passes.

Peaks are not monotone in the mesh, and coarse meshes can read LOW. On the
cookbook bracket (PETG, 120 N):

| Run | Passes (mesh mm / elements / governing peak MPa / error %) | Result | Wall |
| --- | --- | --- | --- |
| `refine: false` | 2.5 / 11388 / 31.0 / 30.0 | SF 1.77, untrusted | 5 s |
| default | 2.5 / 11388 / 31.0 / 30.0; 1.67 / 36516 / 29.3 / 26.3; 1.27 / 79737 / 30.2 / 20.2 | SF 1.82, trusted, peak converged (3.2 %) | 136 s |
| 30000-element budget | 2.5 / 11388 / 31.0 / 30.0; 1.87 / 28452 / 29.0 / 24.5 | SF 1.89, trusted | 42 s |

The aluminium bracket at the top of this page reads 42.5 MPa at 4 mm and
49.7 MPa at 1.91 mm (still +6.9 % on the last step, `'max-passes'`): the
coarse mesh read about 15 % low. When refinement ends untrusted, size
against the finest pass and keep a margin, or run a finer mesh_size.

## A verdict in the load-capacity shape

When all you need is "does it hold?", ask `verify` instead of reading the
whole summary:

```
verify({ check: 'load-capacity', mode: 'fea', file: 'bracket.kcad.ts' })
```

It solves the study and answers in the same shape as the closed-form beam
check, so one reader handles both methods:

- `ok`: whether `safetyFactor` reaches `threshold`. The threshold is
  `safety_factor_threshold`, else the study's `minSafetyFactor`, else 1.5.
- `elements[]`: one entry per stress region, `{ partName: '@kc[...]',
  stressPa, yieldPa, safetyFactor, at }`, worst first.
- `failures[]`: the regions under the threshold.
- `diagnostics`: carries `fea.safety-factor.below-min` with the region to fix.
- `fea`: `peakStressPa`, `maxDisplacementMm`, `meshTrusted` and
  `trustReasons`, the `refinement` record, plus `peakAtSupportPa` when a
  clamped edge holds a singular peak.

Heatmaps are off by default here (`heatmaps: true` to render them). The
study name and mesh size override work exactly as for `run_fea`.

## The gate

A study with `minSafetyFactor` runs on every `evaluate_script` /
`kernelcad evaluate` and fails it with `fea.safety-factor.below-min` when the
margin is not met — the same seam the `dfmSpec` gates use. A study *without*
`minSafetyFactor` costs nothing at evaluate: it is a report you fetch with
`run_fea`.

`KERNELCAD_FEA_GATE=off` skips the solve, and says so with a warning that the
declared margin is UNVERIFIED — a skipped gate never reads as green.

The gate does NOT refine the mesh: it runs on every evaluate, and one
refinement pass costs 3-20x the first solve (the bracket: 5 s becomes about
2 min). Instead, a margin met on an untrusted mesh is reported as
`fea.safety-factor.unverified` (warning), not as a pass. Its next step: run
verify mode 'fea', which refines, then set the study's `meshSize` to the
size of the trusted pass in `fea.refinement`, so every evaluate gates on a
trusted mesh at single-solve cost. `KERNELCAD_FEA_GATE_REFINE=on` makes the
gate refine too (CI, or when the wall time is acceptable). A margin that is
NOT met stays an error either way.

## Stress-graded FDM infill

The same study drives per-region infill for a 3D print: export a 3MF with
`options.infill { fromFea: '<study>' | true }` and the export solves the study,
bins the part by von Mises / yield (default < 15 % -> 10 %, 15-40 % -> 25 %,
> 40 % -> 60 % gyroid) and writes one modifier volume per dense
band (Orca/Bambu format by default; `options.slicer: 'prusa'` writes PrusaSlicer's
format, which the other two do not read). The bands are voxel unions (2-5 mm cells) grown until watertight, so
they err toward more infill. Elements in the support zone around the fixed
faces (the screw bosses) always get the densest band, because the clamp load
the solve leaves out still acts there. The result reports the band table, a filament
and time saving against uniform infill at the high density, and heatmap /
band / cutaway PNGs. Recipe: `lookup_cookbook('stress-graded-infill-fdm')`.
The export solves once by default: the bands barely move with the mesh (the
bracket: band volumes within 3 points, saving 36.1 vs 36.4 %) and refining
made the export 23x slower (10 s to 237 s). `infill.refine: true` refines
like `run_fea`; check `fea.trust` in the report either way.
Cura is not supported: it reads per-object settings from a 3MF (an infill mesh with its own
infill density), but that path could not be verified end to end here, so no Cura file is
written; in Cura, add the dense regions as infill meshes by hand.
The study models solid material: treat the safety factor as an upper bound
for a printed part.

## Diagnostics

| Code | What happened | What to do |
| --- | --- | --- |
| `fea.safety-factor.below-min` | Solved SF is under the declared floor. | Add material at `hotSpots[0].region`, pick a stronger grade, spread the load, or lower the floor if it was conservative. |
| `fea.mesh.quality-low` | Stress is mesh-limited, or the mesh has inverted elements / too many slivers; refinement was off, not applicable, or used all its passes. | Re-run with a smaller `meshSize`; simplify slivers in the geometry. |
| `fea.mesh.refine-stopped` (warn) | Automatic refinement hit the element or wall-time budget, or a finer pass failed, before the stress was trusted. | Read the pass table in the message. Raise `KERNELCAD_FEA_MAX_ELEMENTS` / `KERNELCAD_FEA_REFINE_TIME_MS` where you control them, run locally with more memory, or keep a larger margin. |
| `fea.safety-factor.unverified` (warn) | The gate met `minSafetyFactor` on an untrusted mesh; the margin is not confirmed. | Run verify mode 'fea' (it refines), then pin the study's `meshSize` to the trusted pass. |
| `fea.stress.support-singularity` (warn) | The raw peak sits at a fixed-face edge, where a rigid clamp makes stress singular; it is reported as `peakAtSupportMPa` and left out of the safety factor. | Read `maxVonMisesMPa` / `minSafetyFactor` as the result. To judge the bolt region itself, load the washer face and fix the far side. |
| `fea.mesh.too-large` | The mesh passed the element ceiling, gmsh or CalculiX timed out, or CalculiX was killed (memory limit, exit 255). | RAISE `meshSize` (about 2x) and re-run; the message carries the solver's last output lines. |
| `fea.solver.unavailable` | `ccx` or gmsh not found (or the gate was switched off). | Install the toolchain above, or set `KERNELCAD_CCX` / `KERNELCAD_FEA_PYTHON`. |
| `fea.study.fixed-unresolved` | `fixed` matched no face, or no meshed surface. | `inspect({ of: 'faces' })`, then pass a selector that matches. |
| `fea.study.load-unresolved` | A load's `faces` matched no face, or no meshed surface. | Same — the force would otherwise land on no node and report a false pass. |

## Scope

Linear static only, one solid per study: small displacements, linear elastic
material, bonded (no contact), no pretension, no modal / buckling / thermal
step. If the part visibly deflects (displacement approaching a wall thickness)
the linear answer understates the stress — reduce the load or treat the result
as a lower bound.

For a beam-shaped part with a declared rectangular cross-section,
`verify({ check: 'load-capacity' })` answers in milliseconds without a solver.
Use FEA when that path reports `kinematic.load.beam-not-applicable`, or when
you need to know *where* the part is overloaded.

## Reproducing a run by hand

`run_fea({ output_dir })` keeps the whole deck: `solver/part.brep` (the
geometry handed to the mesher), `solver/mesh.json`, `solver/job.inp` (the
CalculiX deck), `solver/job.frd` / `.dat` (raw results), and
`fea-summary.json`. `cd` into `solver/` and run `ccx job` to reproduce the
exact solve.

## Worked example

`examples/fea/shelf-bracket-fea.kcad.ts` — an L-bracket with the run commands
and measured expected output in its header, including the failing variant.
