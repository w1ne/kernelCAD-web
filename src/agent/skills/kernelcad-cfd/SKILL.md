---
name: kernelcad-cfd
description: Answer "how much pressure does this duct, pipe or manifold cost, how does the flow split, and how much drag does this part see?" with OpenFOAM evidence — declare a steady incompressible flow study with shape.cfdStudy({ flow, fluid, inlet, outlet, velocity | flowRateLpm }) or pass it on the call, then run it with run_cfd (or `kernelcad cfd run`) for pressure drop, per-outlet flow and mass balance, drag / lift with Cd / Cl, max velocity, the Reynolds number and turbulence model, a residual history with a convergence verdict, checkMesh quality and a mid-plane velocity PNG. Use when sizing a coolant manifold, air duct, nozzle or pipe run, or when a part sits in a stream.
---

# kernelCAD — CFD (OpenFOAM)

Declare the flow in the model, run the solver, read the evidence.

```typescript
const manifold = box(60, 40, 16)
  .hole('left', { u: 0, v: 0, diameter: 8, depth: 40 })
  .hole('right', { u: -10, v: 0, diameter: 5, depth: 26 })
  .hole('right', { u: 10, v: 0, diameter: 4, depth: 26 })
  .subtract(cylinder(24, 3).rotate([1, 0, 0], -90).translate(37, 8, 8));   // printed gallery

manifold.cfdStudy({
  name: 'splitter',
  flow: 'internal',
  fluid: 'water',
  inlet: { atX: 0 },                                                // the 8 mm port opening
  outlet: [{ atX: 60, near: [60, 10, 8] }, { atX: 60, near: [60, 30, 8] }],
  flowRateLpm: 0.3,
});
return manifold;
```

```
run_cfd({ file: 'manifold.kcad.ts', output_dir: '/tmp/manifold-cfd' })
// → { ok: true, summary: { pressureDropPa: 48.7, reynolds: { value: 794 }, turbulence: { model: 'laminar' },
//     patches: [inlet -0.3 L/min, outlet_1 0.179 L/min, outlet_2 0.121 L/min], massBalance: { imbalance: 9e-5 },
//     convergence: { verdict: 'converged', criterion: 'monitors', ... }, mesh: { cells: 17504, ok: true } },
//     images: ['/tmp/manifold-cfd/velocity-midplane.png'] }
```

The same study on the call, without a declaration:
`run_cfd({ code, flow: 'external', fluid: 'air', velocity: 10, direction: '+X' })`.
From the shell: `kernelcad cfd run part.kcad.ts [--flow ... --inlet '{"atX":0}' ...]`;
`kernelcad cfd status` (= `cfd_summary`) says whether OpenFOAM is installed.

## The fluid domain

- **Internal, `fluidVolume: 'interior'` (default).** The fluid is the part's
  channels: the bounding box minus the part, keeping the regions an inlet or
  outlet opens into. Channels must open **flush onto the part's bounding box**
  (pipe ends, manifold ports on the outer faces); a port recessed behind a boss
  leaks into the exterior and fails with `cfd.domain.no-fluid`. Bolt holes are
  enclosed voids no inlet reaches, so they are dropped.
- **Internal, `fluidVolume: 'solid'`.** The solid itself is the fluid (model
  the flow passage directly).
- **External.** A box of fluid around the part (3 body lengths up and to the
  sides, 8 downstream), `velocity` along `direction`; the body is one wall
  patch `body`, the box faces are `inlet`, `outlet` and slip `sides`.

`inlet` / `outlet` are FaceQuery selectors (or refs) **on the fluid volume**:
`{ atX: 0 }` is the opening disc, not the part's end face. Several faces at the
same plane: use `near: [x, y, z]` to pick one. An `outlet` array makes
`outlet_1`, `outlet_2`, ... and reports the split. A selector that matches no
fluid face fails with `cfd.study.patch-unresolved` listing the fluid faces.

## Study fields

| Field | Meaning |
|---|---|
| `flow` | `'internal'` or `'external'` (required). |
| `fluid` | `'water'` (998.2 kg/m³, 1.004e-6 m²/s), `'air'` (1.205, 1.511e-5), or `{ rho, nu }` SI. |
| `velocity` | m/s: normal inlet speed (internal) or free stream (external). |
| `flowRateLpm` | internal alternative to `velocity`, L/min. |
| `outletPressurePa` | gauge, default 0. |
| `meshSize` | surface cell mm, or `'coarse'` (8 cells across the inlet / body), `'medium'` (14, default), `'fine'` (22). |
| `iterations` | SIMPLE cap, default 400 (10..5000). |
| `residualTarget` | default 1e-4. |
| `turbulence` | `'auto'` (default): laminar below Re 2300 internal / 1000 external, k-omega SST above (2300..4000 flagged transitional). |
| `referenceAreaMm2` | external Cd / Cl area; default projected frontal area. |

## Reading the result

- `ok` is **true only when the solve converged**. `convergence.criterion` says
  how: `'residuals'` (target met) or `'monitors'` (residuals plateaued below
  5e-2 but the pressure drop / drag stayed within a 1% band over the last 20%
  of iterations, mass balanced to 0.5%, at least 200 iterations).
- Not converged: `ok: false`, `cfd.solve.not-converged`, and
  `convergence.monitor { mean, band }` — the honest error bar. Flows with
  impinging jets at Re above ~1000 are often physically unsteady; a steady
  solve will not settle. Lower the flow, smooth the junction, or treat the
  mean ± band as the answer.
- `cfd.flow.regime-caveat` (info): transitional pipe flow, a shedding wake, or
  steady RANS drag — read the number as an estimate.
- `mesh.ok` false → `cfd.mesh.quality-low`; `cfd.mesh.failed` when snappy
  found nothing to mesh or the fluid leaked into the background box.
- Every summary carries `disclaimer`: an engineering estimate, not a
  certification.

Validation (OpenFOAM v2406, default `medium` mesh): Hagen–Poiseuille pipe
D 10 mm, L 200 mm, Re 20: 0.1327 Pa vs 0.1273 Pa (+4.2% including inlet
development), centreline 1.99 × mean. Sphere at Re 50: Cd 1.594 vs
Schiller–Naumann 1.542 (+3.4%).

## Toolchain

OpenFOAM is not bundled (GPL). Discovery: `KERNELCAD_OPENFOAM` (a wrapper
like `/usr/bin/openfoam2406`, `native` or `docker`) → `simpleFoam` on PATH →
an `openfoamNNNN` wrapper → a LOCAL Docker image (`KERNELCAD_OPENFOAM_IMAGE`,
default `opencfd/openfoam-run:2406`, about 250 MB download / 1 GB on disk; never
pulled implicitly). Containers run with `--network none`. Missing →
`cfd.solver.unavailable` with the install command.

Solver processes: `cores` (default 1, capped by `KERNELCAD_CFD_MAX_CORES`,
default 2). Each run is keyed by a hash of the generated case: calling
`run_cfd` again with the same inputs returns the finished result
(`reused: 'finished'`) or waits on the live run (`reused: 'joined'`), so a
client that timed out can simply call again. `cfd_summary({ output_dir })`
reads a stored summary, or the progress stage of a run still going.

`output_dir` keeps the case (`case/system`, `case/constant/triSurface/geometry.stl`,
logs), `cfd-summary.json`, `cfd-result.json` and the PNG; `export_vtk: true`
adds `case/VTK` (foamToVTK) for ParaView.
