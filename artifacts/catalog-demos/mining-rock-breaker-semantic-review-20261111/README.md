# Mining rock-breaker semantic review

**Date:** 2026-11-11
**Asset:** `mining/rock-breaker-boom`
**Change:** Mount the two yellow warning posts on the pit wall.

## Finding

The prior rendered preview showed both yellow posts suspended 600 mm above the
concrete wall and placed at its outside edge. The source now places them over the
wall centerline on 240 × 240 mm steel base plates, with four anchor rods per
plate extending into the wall and nuts above each plate. The asset ID and
1,800-triangle budget are unchanged. The regenerated default preview contains
1,638 triangles.

| Before | After |
|---|---|
| [Rendered preview](previews/before.png) | [Rendered preview](previews/after.png) |

The [source snapshots](source/) retain the exact before and after model files.
The five-item visual audit ledger and dated reference comparisons are kept in
the private `kernelCAD-private/catalog-mining-rock-breaker-semantic-review-20261111/COMPARISON.md` record.

The mining quality gate reports 50/50 passing assets. After syncing the current
`develop`, the whole-catalog gate reports 2,401/2,402 (99.96%); the remaining
thin asset is `standard-components/beam-coupling`, outside this mining correction.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts rock-breaker-boom
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/rockBreakerBoomFidelity.test.ts
npx eslint catalog/kits/mining/
bash artifacts/catalog-demos/mining-rock-breaker-semantic-review-20261111/build-demo.sh
```

The retained [demo settings](demo-settings.json), [capture script](build-demo.sh),
and verification logs describe the local source render, index rebuild, test, and
video capture. The [12-second MP4](demo.mp4) shows the before and after previews;
its codec, duration, and resolution are recorded in
[`video-review/video-inspection.json`](video-review/video-inspection.json), and
both captioned frames were visually checked.

The canonical `kernelcad render inspect` attempt is recorded in
[`verification/render-inspect.log`](verification/render-inspect.log). Playwright
timed out attaching to the existing Chrome CDP session before opening a capture
tab. The existing browser remained open, and no second browser was launched.
The PNGs in this bundle are the repository's rendered catalog previews.

## Verification boundary

This bundle records a local source render and geometry regression check. The
branch is not deployed, so the current public asset page still serves its
existing version. Replay and local source validation do not establish mine
safety, installation suitability, breaker performance, or physical acceptance.
