# Garden catalog wave demo bundle

This 24-second reel presents the generated previews for all 40 new garden assets. It was built from the checked-in, locally rendered kernelCAD catalog preview PNGs. The assets are original CC0 parametric models in [the garden kit source](../../../catalog/kits/garden); the reel itself shows the local asset/catalog workflow and result.

## Reproduce

Run from the repository root, after catalog sources pass validation and generated previews are current:

```sh
python3 artifacts/catalog-demos/garden-wave-20261102/build_demo.py
```

The script writes six 1600 × 920 still frames and uses FFmpeg to create `garden-kit-demo.mp4` at 30 fps, H.264, yuv420p, 24 seconds. Exact generator settings are in [`demo-settings.json`](demo-settings.json); the source is [`build_demo.py`](build_demo.py).

## Verification evidence

- `checkCatalogAsset`: 40/40 sources passed; one palette material each; triangle counts 84–360; all report `minUpM: 0`.
- `npm run catalog:build`: completed and wrote `catalog/index.json`.
- `npm run catalog:previews`: completed; generated 40 garden previews.
- `npx vitest run tests/integration/catalog/catalogIndex.test.ts`: passed 2 tests, including all-source export, triangle/material and fresh-index checks.
- [`asset-check-results.json`](asset-check-results.json) retains per-asset budgets, triangle counts, base-plane results and material counts.
- The MP4 was probed as 1600 × 920 H.264 at 30 fps and 24 seconds. Six representative frames were extracted from the MP4 and visually inspected; the four contact sheets are labelled and the greenhouse roof is seated against its eaves.

## Scope status

- Local model checks and generated catalog previews: **PASS**.
- Replay or simulation: **not part of this asset wave**.
- Public deployment: **not verified**; the PR is not merged.
- Hardware build or physical acceptance: **not performed**.

## Untracked generated outputs

`frames/` is not tracked in git; it is regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/garden-wave-20261102/build_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
