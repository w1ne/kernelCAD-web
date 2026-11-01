# run_cfd: pressure drop and flow split of a printed coolant splitter

A 60 × 40 × 16 mm PETG manifold (`manifold.kcad.ts`) takes a 0.3 L/min water
loop in through an 8 mm port and splits it between a 5 mm and a 4 mm outlet
through a printed internal gallery. The model declares the study:

```ts
manifold.cfdStudy({
  name: 'splitter-0.3lpm', flow: 'internal', fluid: 'water',
  inlet: { atX: 0 },
  outlet: [{ atX: 60, near: [60, 10, 8] }, { atX: 60, near: [60, 30, 8] }],
  flowRateLpm: 0.3, meshSize: 'medium', iterations: 600,
});
```

`kernelcad cfd run docs/demos/cfd-manifold/manifold.kcad.ts` (the `run_cfd`
tool) extracts the fluid (bounding box minus part; the four M4 bolt holes are
dropped because no inlet reaches them), meshes it with snappyHexMesh, solves
with simpleFoam and returns:

| | value |
| --- | --- |
| Reynolds number | 794 on the 8 mm inlet → laminar |
| Mesh | 17 504 cells, checkMesh OK, max non-orthogonality 53.8° |
| Pressure drop | 48.7 Pa |
| Flow split | 5 mm outlet 0.179 L/min (59.7%), 4 mm outlet 0.121 L/min (40.3%) |
| Mass balance | 0.009% |
| Convergence | converged on steady monitors: Δp within a 0.53% band over the last 20% of 600 iterations; residuals plateaued at 1.4e-2 |
| Time | mesh ~7 s, solve ~33 s, one core, local Docker image |

At 0.5 L/min and above the jets into the gallery do not settle in a steady
solve; the tool then returns `ok: false` with `cfd.solve.not-converged` and the
pressure-drop band (we saw 1.4% at 2 L/min with k-omega SST, 4% at 0.8 L/min
laminar). The demo uses the flow at which the steady answer is trustworthy.

Validation on the same machine (`validation.json`): Hagen-Poiseuille pipe
D 10 mm, L 200 mm, Re 20: 0.1327 Pa vs 0.1273 Pa (+4.2%, including inlet
development), centreline 1.986 × mean. Sphere at Re 50: Cd 1.594 vs
Schiller-Naumann 1.542 (+3.4%).

View the [17.5-second demonstration](demo.mp4): the part, the extracted fluid
volume, the command and its output, the velocity mid-plane, the validation
numbers.

## Files

- `manifold.kcad.ts` — the part and its `cfdStudy` (source of truth).
- `record.ts` — runs the manifold study and both validation cases through
  `runCfdTool`; writes `result.json`, `transcript.txt`, `validation.json`,
  `velocity-midplane.png` (the tool's own preview) and `fluid-volume.stl`.
- `fluid-volume.kcad.ts` — loads `fluid-volume.stl` (the solver STL, m → mm)
  to render the fluid volume.
- `frames.ts` — composes the five 1280 × 720 frames.
- `record.sh` — the whole rebuild; `ffprobe.txt` — the encoded video.

## Reproduce

```sh
docker pull opencfd/openfoam-run:2406   # or a native OpenFOAM
npx playwright install chromium
./docs/demos/cfd-manifold/record.sh
```

The renders are kernelCAD's headless publish preset; the velocity image is the
cell-centred cutting plane OpenFOAM wrote, drawn by `run_cfd`. This is a local
run on a development machine with OpenFOAM v2406 in Docker. It does not show
the hosted MCP service, and the manifold was not printed or flow-tested.
