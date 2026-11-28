# Shipyard plasma cutting gantry head — semantic review

Date: 2026-11-28  
Base: fresh `origin/develop` at `929ce50d7`  
Asset: `shipyard/plasma-cutting-gantry-head` (existing ID retained)

## Finding

The five-preview audit found one clear semantic scope mismatch. The asset ID said “gantry head,” but its source and render described a complete CNC plasma cutting machine: 8.257 × 2.050 × 5.478 m, with floor rails, slat table, extraction, operator station and full end carriages. No material-color mismatch was established among the five previews; this repair addresses the false scope label.

The replacement model is a torch-head assembly on a short local bridge section. It contains the beam segment, cross-slide guides and bearing blocks, carriage plate, motorized Z lifter, torch clamp, shaped torch barrel/nozzle and cable carrier. It excludes the full table, floor rails, extraction system and operator station. The title and description now match the existing asset ID.

The result measures **1.360 × 1.158 × 0.618 m**, with **1,024 triangles** against a **1,600-triangle budget**. It has four editable material controls (painted steel, machined steel, cable polymer, copper alloy) and three appearance presets.

## Audit and references

The five-image ledger is in [preview-review.md](preview-review.md); it records the visible form of each candidate and the reason this asset was selected. The current public catalog hub was checked on 2026-11-28; the per-asset route was unavailable from the web cache during the audit. Detailed external manufacturer comparisons are stored privately in `kernelCAD-private/catalog-shipyard-20261128/`.

## Source and visual evidence

- `before/` — original `.kcad.ts` source and rendered preview.
- `after/` — corrected `.kcad.ts` source and rendered preview.
- `video-inputs/` and `make_demo.py` — source frames and generator for the 12.5-second demo.
- `demo-settings.json` — command, video settings and claim boundaries.
- `review-demo.mp4` — inspected H.264 demo. It shows the old full-machine preview, the scope correction, the new preview and the local regression.
- `video-review/` — `ffprobe` metadata and sampled frames. All four frames were visually checked; text is legible at 1280 × 720 and both previews are unobstructed.
- `verification/render-inspect.txt` — the local render-inspection timeout and cleanup result.

The catalog preview itself was generated with:

```sh
npx tsx scripts/renderCatalogPreviews.ts plasma-cutting-gantry-head
```

The visual inspection command used the already-running Chrome CDP session, with a 180-second command lifetime and 60-second screenshot timeout. It timed out waiting for the local demo player to become ready after 30 seconds; the CLI closed its temporary tab and no browser or render-server process was left running. The software-rendered catalog preview and recorded demo remain the reviewed visual evidence.

## Verification

- Focused exported-GLB regression: **1/1 passed**. It asserts the head-specific parts, rejects full-system components, checks the measured envelope and triangle budget, and confirms the material controls and presets.
- Shipyard ESLint: **passed**.
- Regression-file ESLint: **passed**.
- Shipyard structural gate: **70/70 pass (100.00%)**.
- Global structural gate: **2,396/2,402 pass (99.75%)**. Six unrelated assets outside Shipyard fail the current script: one in Grid Substation, one in Industrial Plant and four in Standard Components. The target asset passes.
- First full `tests/integration/catalog/` run: found that the asset's lowest point was 100 mm above the required base origin. The source was corrected to put the torch tip at Z=0, and the focused exported-GLB regression passed after the correction. See `verification/catalog-integration-first-run.txt`.
- Full `npx vitest run tests/integration/catalog/` rerun: **232/232 files and 389/389 tests passed** in 801.39 seconds after merging `origin/develop` at `ad23deb70`, including the exhaustive asset index freshness checks. A summary is in `verification/catalog-integration.txt`.
- `catalog/index.json` was regenerated from source. The target row has the refreshed source SHA-256, the existing preview URL, the new geometry statistics, four color params and three presets.

## Claim boundary

This is a generic KernelCAD visualization asset. The local preview and software geometry regression do not simulate plasma cutting, establish a vendor design or equipment performance, or constitute deployment or physical-machine acceptance. No deployment was performed.
