# Battery quarantine drum material review

**Date:** 2026-11-11
**Asset:** `recycling-facility/battery-quarantine-drum`
**Change:** Give the kraft-paper vermiculite sack its own beige finish instead
of reusing the alarm cabinet's yellow paint.

## Five-preview audit ledger

| Asset | Rendered preview review |
|---|---|
| `battery-quarantine-drum` | The drum, closing ring, lid vent, probe/alarm post, grated sump and sack are recognizable. Before the change, sack and alarm shared a yellow finish. |
| `glass-crusher` | Low feed hopper and inclined belt lead to a drum mill; cullet collects in a skip. The glass, rubber belt, frame and painted housing read as separate materials. |
| `optical-color-sorter` | Inspection cabinet, conveyor, lighting/viewing area, control panel and separated material streams are visible. |
| `battery-dropoff-cabinet` | Rain roof, ventilated collection cabinet, chemistry flaps, service doors, extinguisher and bollards are visible; painted body and safety trim are distinct. |
| `bottle-crusher` | Compact cabinet, top feed port, control panel, open front door and internal collection bin are visible; cabinet, accent panels, polymer bin and glass are distinct. |

`friction-washer` and `plastic-flake-dryer` were excluded after PR #1258's
earlier round comment named them. The five audited IDs above have no matching
open asset-fix issue or PR.

## Change and evidence

The source keeps its four existing material controls (`drum`, `ring`, `tray`,
`alarm`) and three presets. The sack's paper color is independent of those
controls, so changing the warning-alarm palette no longer recolors the sack.
The default mesh is 1,800 triangles under its 3,000-triangle budget. No IDs,
dimensions, or budgets changed.

| Before | After |
|---|---|
| [Branch preview before](previews/before.png) | [Branch preview after](previews/after.png) |

The [before/after source snapshots](source/) and [demo settings](demo-settings.json)
are retained here. The [12-second MP4](demo.mp4) shows the actual catalog
preview before and after, with local-render and deployment-status captions.
The [capture script](build-demo.sh) records the exact ffmpeg invocation.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts battery-quarantine-drum
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit recycling-facility
npx eslint catalog/kits/recycling-facility/ tests/integration/catalog/batteryQuarantineDrumMaterials.test.ts
npx vitest run tests/integration/catalog/batteryQuarantineDrumMaterials.test.ts
npx vitest run tests/integration/catalog/
bash artifacts/catalog-demos/battery-quarantine-drum-material-review-20261111/build-demo.sh
```

The browser-based `kernelcad render inspect` attempt and its bounded attachment
log are retained under `verification/`. It connected to the existing Chrome
CDP endpoint but timed out waiting for the session; no second browser was
started, and the user's Chrome remained running. The generated catalog preview
was opened and visually checked directly.

Verification logs and the generated index row are in `verification/`. Local
source validation and replay are distinct from deployment and physical
acceptance.

Final checks: kit lint passed with no diagnostics; the catalog integration
suite passed all 30 tests across 15 files. Its all-assets export test rebuilt
the index and verified it byte-for-byte against the committed index.

The kit quality check reports 153/153 passing (100%). The catalog-wide
mechanical scan reports 2,401/2,402 passing (99.96%); its one failure is the
unchanged `standard-components/beam-coupling` asset, outside this semantic
preview fix. This scan is not a realism score.

## Deployment boundary

This feature branch is not deployed. On 2026-11-11, the public preview URL
`https://kernelcad.com/assets/recycling-facility-battery-quarantine-drum.png`
still returned the earlier 512-triangle gray drum without the alarm or sack.
That production asset was not changed or verified as fixed by this branch.
The MP4 shows local software renders; it is not a production browser capture,
equipment specification, safety certification, or physical acceptance.
