# CFD with OpenFOAM: `run_cfd`

kernelCAD runs steady, incompressible flow studies on the model you built,
through an external [OpenFOAM](https://www.openfoam.com) (ESI v2312 or newer).
Use it to size a duct, pipe, nozzle or coolant manifold (pressure drop, how the
flow splits between outlets) or to estimate the drag on a part in a stream.

Surfaces:

| Surface | Call |
| --- | --- |
| Script | `shape.cfdStudy({ flow, fluid, inlet, outlet, velocity \| flowRateLpm, ... })` (declaration only) |
| MCP | `run_cfd({ file \| code, study? \| inline fields, output_dir?, cores? })`, `cfd_summary({ output_dir? })` |
| CLI | `kernelcad cfd run <file> [--flow ... --inlet '{"atX":0}' --outlet ... --velocity ...]`, `kernelcad cfd status [--out dir]` |

The field reference, the result fields and how to read the convergence
verdict are in the `kernelcad-cfd` skill (`src/agent/skills/kernelcad-cfd/SKILL.md`).

## Pipeline

1. **Fluid volume.** Internal flow: the bounding box minus the part, keeping
   the regions an inlet or outlet opens into (channels must open flush onto
   the bounding box), or the solid itself with `fluidVolume: 'solid'`.
   External flow: a box 3 body lengths upstream and to the sides, 8 downstream.
2. **Patches from model faces.** `inlet` / `outlet` FaceQuery selectors are
   resolved on the fluid volume with the same resolver as `feaStudy`. Each
   patch is written as its own region of `constant/triSurface/geometry.stl`
   (`inlet`, `outlet` or `outlet_1..n`, `walls`; external: `body`).
3. **Mesh.** `blockMesh` background box, `surfaceFeatureExtract`,
   `snappyHexMesh` (castellate + snap, no layers), `checkMesh`. Cell size
   follows `meshSize` (`'medium'` = 14 cells across the equivalent inlet or
   frontal diameter). A fluid that leaks into the background box fails with
   `cfd.mesh.failed`.
4. **Solve.** `simpleFoam`, SIMPLEC, laminar or k-omega SST chosen from the
   Reynolds number (internal: laminar below 2300, transitional 2300-4000
   flagged; external: laminar below 1000). Function objects record the patch
   flow and pressure, max |U| and body forces every iteration, and cut a
   mid-plane for the preview. `cores > 1` decomposes and runs with MPI.
5. **Evidence.** Pressure drop, per-patch flow and mass balance, Cd / Cl,
   max velocity, residual history, a convergence verdict, the checkMesh
   report and `velocity-midplane.png`. `ok` is true only when converged.

## Validation

Measured with OpenFOAM v2406 (`opencfd/openfoam-run:2406`), default mesh, by
`tests/integration/cfd/validation.live.test.ts` (skipped when OpenFOAM is not
installed) and `docs/demos/cfd-manifold/record.ts`:

| Case | run_cfd | Analytic | Error |
| --- | --- | --- | --- |
| Hagen-Poiseuille, water, D 10 mm, L 200 mm, Re 20 | 0.1327 Pa | 0.1273 Pa | +4.2% (includes inlet development) |
| Same, centreline / mean velocity | 1.986 | 2 | -0.7% |
| Sphere D 10 mm in air, Re 50 | Cd 1.594 | Schiller-Naumann 1.542 | +3.4% |

These are laminar checks. Turbulent results (k-omega SST with wall
functions, no boundary-layer cells) are estimates; the result carries a
`cfd.flow.regime-caveat` saying so.

## Installing OpenFOAM

Either works; kernelCAD never downloads it for you.

```sh
# Native (Ubuntu / Debian)
curl -s https://dl.openfoam.com/add-debian-repo.sh | sudo bash
sudo apt-get install -y openfoam2406-default

# Or the slim container image (~250 MB download, ~1 GB on disk)
docker pull opencfd/openfoam-run:2406
```

Discovery order: `KERNELCAD_OPENFOAM` (a wrapper path such as
`/usr/bin/openfoam2406`, or `native` / `docker`), `simpleFoam` on PATH, an
`openfoamNNNN` wrapper on PATH, then a local image
(`KERNELCAD_OPENFOAM_IMAGE`, default `opencfd/openfoam-run:2406`). Containers
run with `--network none` and are killed by name on a timeout.
`KERNELCAD_CFD_MAX_CORES` caps solver processes (default 2).
`KERNELCAD_REQUIRE_CFD_TOOLCHAIN=1` makes the integration test fail instead
of skipping when OpenFOAM is missing.

## Long runs

A run takes tens of seconds (the demo manifold: 17.5k cells, about 7 s mesh
and 35 s solve on one core) to many minutes. The run directory is keyed by a
SHA-256 of the generated case (every dictionary, the STL and the toolchain).
Calling `run_cfd` again with the same inputs returns the stored result
(`reused: 'finished'`) or waits for the live run (`reused: 'joined'`) instead
of starting a second solver, so a client that hit its time limit can call
again. `cfd_summary({ output_dir })` returns the summary, or the
`progress.json` stage of a run in flight.

## Sandbox mode

`run_cfd`'s `file` (read) and `output_dir` (write) are in the audited
argument tables, as are `kernelcad cfd run <file> --out`. OpenFOAM is a child
process: like CalculiX it inherits the sandbox environment but not the
in-process guards. The Docker route bind-mounts only the run directory and
runs with `--network none`.

## Limits

- Steady, incompressible, single-phase, isothermal. No heat transfer,
  compressibility, combustion, free surfaces or transient flow.
- Interior channels must open flush onto the part's bounding box.
- No boundary-layer cells: wall shear and turbulent drag are estimates.
- An unsteady flow (impinging jets, vortex shedding) does not settle in a
  steady solve; the result is `ok: false` with the monitor band as error bar.
- An engineering estimate, not a certification or a substitute for test.
