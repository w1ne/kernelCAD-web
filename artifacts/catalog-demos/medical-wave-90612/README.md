# Medical catalog wave demo bundle

This bundle records the local kernelCAD workflow and previews for 40 original medical scene props.

**Video:** [medical-kit.mp4](medical-kit.mp4) — 24 seconds, 1280×720, H.264 / yuv420p, 261,087 bytes.

## Reproduce the demo

From the repository root, run:

```sh
python3 artifacts/catalog-demos/medical-wave-90612/capture_medical_demo.py
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,pix_fmt -of json artifacts/catalog-demos/medical-wave-90612/medical-kit.mp4
```

The capture source reads the committed medical `.kcad.ts` files, generated `catalog/index.json`, 40 rendered PNG previews, and the local verification records. Settings are in [settings.json](settings.json). The six decoded frames are retained in [frames/](frames/).

## Verification evidence

- [asset-check-results.json](asset-check-results.json): all 40 source checks passed; each has one material, stays within its declared triangle budget, and rests at z = 0.
- Catalog index: 413 total assets, including 40 medical records.
- `npm run catalog:previews`: completed for the full 413-asset catalog; all 40 medical preview PNGs are included under `catalog/kits/medical/previews/`.
- [catalog-pages-check.json](catalog-pages-check.json): local static-page build contains all 40 medical pages, their preview images, and the Medical kit in the hub.
- `npx vitest run tests/integration/catalog/catalogIndex.test.ts`: 2 tests passed.
- `ffprobe`: confirms a 24-second H.264 video at 1280×720 with yuv420p.
- The MP4 was decoded back into six frames and visually inspected. The source, grouped previews, counts, and local verification status are legible.

## Deployment status and limits

The branch is not deployed. On 2026-11-02 the live `https://kernelcad.com/catalog/` route returned HTTP 404 before this PR; live-page verification remains pending after a future deployment. This demo shows local source checks, export and generated catalog output only. It does not claim simulation, physical or clinical validation, hardware acceptance, or deployed behavior.

The kit documentation is [catalog/kits/medical/README.md](../../../catalog/kits/medical/README.md). All models are original kernelCAD source under CC0 1.0; external references inform category scope and naming only.
