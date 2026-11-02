# Industrial Plant catalog wave demo

This bundle demonstrates the local kernelCAD workflow for the 60-asset
`industrial-plant` kit: parametric `.kcad.ts` sources, catalog index build, and
software-rendered preview PNGs. The MP4 shows eight actual default previews
from the rebuilt catalog.

## Reproduce

```sh
npm run catalog:build
npm run catalog:previews
npx tsx docs/demos/catalog-wave-industrial-plant-20261102/generate.mts
```

`generate.mts` records the eight preview inputs, title cards, 1280×720 output,
24 fps H.264 settings, and FFmpeg invocation. `verification.json` records the
asset count, preview triangle range, catalog gate result, and probed video
metadata.

## Evidence scope

- `demo.mp4` uses the real catalog preview PNGs for the chemical storage tank,
  centrifugal pump, axial exhaust fan, cooling tower, belt conveyor, overhead
  crane, motor control cabinet, and safety shower.
- The preview PNGs are software renders of catalog GLB triangles. This is local
  catalog validation and preview evidence. It does not demonstrate deployed
  page behaviour, simulation, replay, or physical hardware acceptance.
- The public page remains pending merge and deployment; this bundle makes no
  deployed-behaviour claim.

## Sources

- Asset sources and kit documentation: [`catalog/kits/industrial-plant/`](../../../catalog/kits/industrial-plant/README.md)
- Demo generator: [`generate.mts`](generate.mts)
- Verification evidence: [`verification.json`](verification.json)
- Video: [`demo.mp4`](demo.mp4)
