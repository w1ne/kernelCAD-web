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
// → { ok: true, summary: { minSafetyFactor: 6.35, maxVonMisesMPa: 42.52,
//     maxDisplacementMm: 0.2595, hotSpots: [{ region: '@kc[fillet_1/face/f7]', ... }],
//     trust: { meshTrusted: false, reasons: [...] }, equilibriumResidual: 5.3e-13,
//     governingField: 'away-from-supports', peakAtSupportMPa: 40.04 },
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
  Re-run with a smaller `meshSize` on the study (or pass mesh_size to
  run_fea for a one-off) before acting on a marginal stress.
- **`equilibriumResidual`** — `|reaction + applied| / |applied|`. Near 1e-12 is
  healthy; anything large means the load or the constraint did not land where
  the study said, and the safety factor is meaningless.
- **`images` + `legend`** — banded stress heatmap PNGs from the same offline
  render pipeline as `render_preview`. The bands QUANTIZE the field (8 steps);
  the numbers in `summary` are the continuous truth. Use the picture to locate
  the problem, the numbers to measure it.

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
  `trustReasons`, plus `peakAtSupportPa` when a clamped edge holds a
  singular peak.

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

## Stress-graded FDM infill

The same study drives per-region infill for a 3D print: export a 3MF with
`options.infill { fromFea: '<study>' | true }` and the export solves the study,
bins the part by von Mises / yield (default < 15 % -> 10 %, 15-40 % -> 25 %,
> 40 % -> 60 % gyroid) and writes one Orca/Bambu modifier volume per dense
band. The bands are voxel unions (2-5 mm cells) grown until watertight, so
they err toward more infill. Elements in the support zone around the fixed
faces (the screw bosses) always get the densest band, because the clamp load
the solve leaves out still acts there. The result reports the band table, a filament
and time saving against uniform infill at the high density, and heatmap /
band / cutaway PNGs. Recipe: `lookup_cookbook('stress-graded-infill-fdm')`.
The study models solid material: treat the safety factor as an upper bound
for a printed part.

## Diagnostics

| Code | What happened | What to do |
| --- | --- | --- |
| `fea.safety-factor.below-min` | Solved SF is under the declared floor. | Add material at `hotSpots[0].region`, pick a stronger grade, spread the load, or lower the floor if it was conservative. |
| `fea.mesh.quality-low` | Stress is mesh-limited, or the mesh has inverted elements / too many slivers. | Re-run with a smaller `meshSize`; simplify slivers in the geometry. |
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
