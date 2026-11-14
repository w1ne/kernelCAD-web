# Case layer palletizer pallet material review — 11 November 2026

This handoff records a local semantic correction to the existing `beverage-bottling-line/case-layer-palletizer` asset. The outfeed `pallet-deck` was assigned to the corrugated-board control even though the asset contains no corrugated layer pad. It now uses a material-named `palletTimber` control. The model geometry, 132-triangle count, 2.39 × 2.025 × 1.1875 m envelope, and preset names are unchanged.

## Preview and demo

| Before | After |
|---|---|
| [Full preview](before.png) · [Deck detail](detail-before.png) | [Full preview](after.png) · [Deck detail](detail-after.png) |

[Watch the inspected 8-second before/after MP4](demo.mp4). Its captions describe local source previews only; they do not imply deployment or equipment/load acceptance.

## Five-preview sample

The sample comprised `pet-blow-molder`, `rotary-filler`, `bottle-rinser-carousel`, `case-layer-palletizer`, and `bottle-unscrambler`. No matching open issue or PR title/body/source path was found. The pre-audit branch diff changed only `cap-elevator` among these five. See [open-target search output](open-target-check-output.json) and [per-preview ledger with bounds and SHA-256 values](preview-ledger.json).

Four previews showed plausible equipment colors. The palletizer's gantry, lift plate, safety gate, and outfeed deck were visible; the mismatch was the outfeed pallet's material control. The before/after crop makes the palette correction visible while preserving its geometry.

## Source and settings

- [Source before](case-layer-palletizer.before.kcad.ts) and [source after](case-layer-palletizer.after.kcad.ts)
- [Render settings and exact invocations](render-settings.json)
- [Video creation source](create-demo.sh)
- The dated product-context comparison is recorded privately at `kernelCAD-private/docs/competitors/2026-11-11-case-layer-palletizer-pallet-material.md`.

## Verification

- `npx vitest run tests/integration/catalog/caseLayerPalletizerPalletTimberMaterials.test.ts` — 1 test passed; the exported GLB assigns the timber color to `pallet-deck` and preserves the envelope and triangle count.
- `npx eslint catalog/kits/beverage-bottling-line/ tests/integration/catalog/caseLayerPalletizerPalletTimberMaterials.test.ts` — clean.
- `npx tsx scripts/renderCatalogPreviews.ts case-layer-palletizer` — rendered 132 triangles.
- `npx tsx scripts/buildAssetCatalog.ts` — completed; only the palletizer row in `catalog/index.json` changed. The row's `sourceSha256` matches the after-source hash.
- `npx vitest run tests/integration/catalog/` — 25 files and 40 tests passed, including the all-catalog index freshness test; full output is in [catalog-integration.log](catalog-integration.log).

The image and source URLs on the live site matched the before files byte for byte when checked. This correction is local to PR #1258 and has not been deployed. It is a visual material-control correction only; the outfeed deck remains a simplified solid slab, and no pallet capacity, strength, safety, or physical acceptance is verified.
