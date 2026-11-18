# Industrial-plant bucket-elevator semantic review

**Date:** 2026-11-11  
**Asset:** `industrial-plant/bucket-elevator`  
**Change:** Keep the buckets inside the elevator casing and reveal them through a framed inspection opening.

## Finding

The before preview showed six bucket blocks outside the opaque casing. The revised scene keeps a rising and return belt strand, two pulleys, and six open bucket cups inside the casing. The front cutaway shows the mechanism without moving the buckets outside the machine. Two additional named material controls distinguish the rubber belt and polymer buckets; the existing `weathered` and `highVisibility` presets set both controls. The asset ID and 1,400-triangle budget are unchanged. The regenerated default preview contains 780 triangles.

| Before | After |
|---|---|
| [Rendered preview](previews/before/bucket-elevator.png) | [Rendered preview](previews/after.png) |

The [five-preview audit ledger](preview-review.md) records the four unchanged assets, the source/preview comparison, selection exclusions, and the single correction. The reviewed sources and hash manifest are retained beside the image evidence. Dated equipment and workflow comparisons are kept privately in `kernelCAD-private/docs/competitors/2026-11-11-industrial-plant-bucket-elevator-semantic-review.md`.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts bucket-elevator
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/bucketElevatorSemantic.test.ts
npx eslint catalog/kits/industrial-plant/ tests/integration/catalog/bucketElevatorSemantic.test.ts
python3 scripts/checkCatalogQuality.py --kit industrial-plant
bash artifacts/catalog-demos/industrial-plant-bucket-elevator-semantic-review-20261111/build-demo.sh
```

The regression reads the generated GLB and checks that every bucket component stays inside the inspection opening and casing envelope, while the belt and bucket material controls remain separately editable. The short [MP4](demo.mp4) compares the local software-rendered before and after previews; its [settings](demo-settings.json), [capture script](build-demo.sh), and [video inspection](video-review/video-inspection.json) are included.

## Verification

Local ESLint passed. The targeted GLB regression passed, and the full catalog integration suite passed (16 files, 31 tests). The `industrial-plant` quality gate reports 60/60 (100%). The global structural gate reports 2,401/2,402 (99.96%); the unchanged `standard-components/beam-coupling` is the one remaining failure. A local static page build generated all 2,402 asset pages; the bucket-elevator page lists the new controls/presets and its copied preview hash matches the regenerated PNG. The refreshed catalog index, full integration log, preview inspection, and local page check are recorded in `verification/`.

The existing Chrome CDP endpoint was checked before browser work and returned `ECONNREFUSED` on `127.0.0.1:9222`. The `kernelcad render inspect` CLI was not run because its current headless-render helper launches a fresh Chromium when no CDP connection is available; no replacement browser was launched. The repository's software renderer produced the PNGs used for visual review and the MP4. The branch is not deployed; replay, local validation, deployed behavior, and physical acceptance are separate. No pressure, capacity, or hardware acceptance claim is made.
