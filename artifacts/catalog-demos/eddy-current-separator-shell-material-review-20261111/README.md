# Recycling facility · eddy-current separator shell material review — 2026-11-11

**Asset:** [`recycling-facility/eddy-current-separator`](../../../catalog/kits/recycling-facility/eddy-current-separator.kcad.ts)
**Preview:** 1,972 triangles / 3,200 budget
**Demo:** [12-second MP4](demo.mp4) · [settings](demo-settings.json) · [build script](build-demo.sh)

## Finding

The asset's red `rotor` finish was assigned to the outer `head-shell` and labeled “Magnetic rotor shell.” The source describes the permanent-magnet rotor as inside that shell. The outer shell now uses a charcoal nonconductive-composite finish; the existing `rotor` parameter key and four presets remain available. No geometry, dimensions, triangle budget, asset ID or count changed.

The [five-preview audit ledger](review-ledger.md) records the four plausible previews, the sole mismatch, and the excluded horizontal baler. The before/after PNGs and source snapshots are retained under `previews/` and `source/`.

| Before | After |
|---|---|
| [Red outer shell](previews/before.png) | [Charcoal composite shell](previews/after.png) |

## Verification

- Focused GLB regression: [`eddyCurrentSeparatorShellMaterials.test.ts`](../../../tests/integration/catalog/eddyCurrentSeparatorShellMaterials.test.ts) passes and checks the exported `head-shell` vertex color, existing parameter key, preset names, and triangle budget.
- ESLint is clean for the recycling-facility kit and focused regression test.
- Recycling-facility structural quality gate: 153/153 passing (100%).
- Catalog-wide structural scan: 2,401/2,402 passing (99.96%). The one failure is the unchanged `standard-components/beam-coupling`; this structural gate does not score semantic realism.
- `catalog/index.json` was rebuilt from source and preview output. Its row points to `/assets/recycling-facility-eddy-current-separator.png` and its `sourceSha256` matches the source snapshot.
- Full catalog integration passed: 21 files / 36 tests. The complete log is retained in [`verification/catalog-integration.txt`](verification/catalog-integration.txt).
- The local static build produced 2,402 asset pages plus hub, sitemap and robots file. The generated detail page includes the rendered preview, composite-shell material control and all four presets; checks are in [`verification/local-page-check.txt`](verification/local-page-check.txt).
- A separate `kernelcad render inspect` attempt timed out during Playwright's CDP handshake with the already-running Chrome session. Its endpoint still reported 61 targets before and after; the catalog renderer's before/after PNGs were independently inspected. See [`verification/render-inspect.log`](verification/render-inspect.log) and [`verification/browser-attachment.json`](verification/browser-attachment.json).

## Public preview status

On 2026-11-11 the public preview URL returned HTTP 200, but it still showed the earlier 540-triangle box-like asset. This branch is not deployed. The MP4 shows local source previews, not deployed behavior, simulation, process performance, equipment specifications, or physical acceptance. See [`verification/public-preview-status.json`](verification/public-preview-status.json).

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts eddy-current-separator
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/recycling-facility/ tests/integration/catalog/eddyCurrentSeparatorShellMaterials.test.ts
python3 scripts/checkCatalogQuality.py --kit recycling-facility
npx vitest run tests/integration/catalog/eddyCurrentSeparatorShellMaterials.test.ts
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-eddy-current-pages-20261111
bash artifacts/catalog-demos/eddy-current-separator-shell-material-review-20261111/build-demo.sh
```

Dated official product, demo and comparable CAD workflow references are recorded privately. Public catalog material stays framed as native kernelCAD behavior.
