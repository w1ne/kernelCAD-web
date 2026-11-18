# Jointed tendon anchor placement demo

This bundle documents issue #917's tendon-meshing regression for a placed part
in the legacy joint path. The native source is
[`examples/kinematic/jointed-tendon-anchor-at.kcad.ts`](../../../examples/kinematic/jointed-tendon-anchor-at.kcad.ts).

## Reproduce and verify

From the repository root, with dependencies and ffmpeg available:

```sh
node --import tsx docs/demos/tendon-jointed-anchor-at/verify.ts
npx vitest run tests/integration/lowering/mateAtPlacement.test.ts --reporter=dot
node docs/demos/tendon-jointed-anchor-at/generate-video.mjs
```

The verification script runs the source through kernelCAD and meshes its
tendon, then checks the endpoint rings against `[110, 0, 0]` and `[-10, 0, 0]`
in millimetres. The integration test independently asserts those coordinates.
The checked result and capture settings are in `verification.json` and
`generate-video.mjs`.

## Demo scope

`demo.mp4` shows the model inputs and the verified endpoint placement. Its
diagram is scaled from the local kernelCAD mesh result; it is not a screenshot
from the Studio renderer. This verifies local script execution and tendon mesh
placement only. It does not claim dynamic simulation, deployed behavior,
hardware acceptance, or physical fit.
