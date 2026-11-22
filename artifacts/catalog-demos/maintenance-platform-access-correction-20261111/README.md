# Maintenance platform access correction

[Watch the 9-second before/after demo](maintenance-platform-access-correction.mp4). It compares the existing asset with the corrected local catalog render, then shows a second angle of the same model.

## Finding and change

The audit inspected five industrial-plant previews: `distillation-column`, `shell-and-tube-exchanger`, `maintenance-platform`, `process-blower`, and `compressed-air-receiver`. The four other previews were recognizable at thumbnail size and were left unchanged. The maintenance platform had no usable stair and disconnected, low guard rails. A first corrected render also showed that the stair tread width and depth were reversed; that was fixed before final validation. The full catalog check then found a lower stringer 29 mm below ground; it was raised to meet the treads, and the regression test now checks that the lowest geometry meets the ground plane.

The final model keeps the existing asset ID and adds a supported four-leg deck, a three-sided guard with top rails, midrails and toe boards, and a three-tread access stair with paired handrails. Its treads are 250 mm deep along the stair run and 560 mm wide across the stringers. Existing `steel` and `safetyPaint` color controls and the `weathered` and `highVisibility` presets remain available.

## Review files

- [Before source snapshot](source/before/catalog/kits/industrial-plant/maintenance-platform.kcad.ts) and [after source snapshot](source/after/catalog/kits/industrial-plant/maintenance-platform.kcad.ts)
- [Before render](previews/before.png), [after render](previews/after.png), and [alternate after view](previews/after-alternate-view.png)
- [Render script](render-demo.ts), [render settings](settings.json), and [video command](make-video.sh)
- [Inspected video frame: before](video-review/frame-before.png), [after](video-review/frame-after.png), and [alternate view](video-review/frame-alternate.png)

Rebuild the stills with `npx tsx artifacts/catalog-demos/maintenance-platform-access-correction-20261111/render-demo.ts`, then create the MP4 with `artifacts/catalog-demos/maintenance-platform-access-correction-20261111/make-video.sh`.

## Verification

- `python3 scripts/checkCatalogQuality.py`: **2402/2402 assets pass (100%, 50 rich kits, 0 thin kits)**.
- `npx eslint catalog/kits/industrial-plant/`: **passed**.
- `npx vitest run tests/integration/catalog/maintenancePlatformFidelity.test.ts`: **passed**. The regression checks material zones, presets, guard and post connections, stair access, tread levels, and tread proportions.
- `npx tsx scripts/buildAssetCatalog.ts`: **final rebuild running after the stringer clearance correction**.
- Full catalog integration suite: **rerun pending after the final index rebuild**. The first run caught the stringer clearance issue and was not treated as a pass.
- Video inspection: H.264, 512×512, 24 fps, 9 seconds; representative frames at 1, 4, and 7 seconds were decoded and visually inspected.

The render uses kernelCAD's catalog GLB export and software preview renderer. It demonstrates local geometry and palette behavior only; it does not establish deployment, building-code compliance, structural capacity, or physical acceptance.
