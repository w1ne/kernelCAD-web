# Mine skip cappel material review — 11 November 2026

This handoff records a local semantic correction to the existing `mining/mine-skip` catalog asset. The cappel is the steel rope termination between the head rope and conveyance. It was colored with the warning-yellow group alongside the floor stripe, guide rollers, and landing keps. It now follows the existing `structuralSteel` control.

The correction changes one material assignment. The 1,490-triangle model, 5.2 × 16 × 5.4 m envelope, presets, and catalog count are unchanged.

## Preview and demo

| Before | After |
|---|---|
| [Full preview](before.png) · [Cappel detail](detail-before.png) | [Full preview](after.png) · [Cappel detail](detail-after.png) |

[Watch the 8-second before/after MP4](demo.mp4). The video shows the local catalog render and a magnified crop of the rope connection; its captions distinguish local preview behavior from deployment and equipment acceptance.

## Source and settings

- [Source before](mine-skip.before.kcad.ts) and [source after](mine-skip.after.kcad.ts)
- [Render settings and invocation](render-settings.json)
- [Video creation source](create-demo.sh)
- Preview render: `npx tsx scripts/renderCatalogPreviews.ts mine-skip`
- Index generation: `npx tsx scripts/buildAssetCatalog.ts`

## Verification

- `npx vitest run tests/integration/catalog/mineSkipCappelMaterials.test.ts` — 1 test passed.
- `npx eslint catalog/kits/mining/ tests/integration/catalog/mineSkipCappelMaterials.test.ts` — clean.
- `npx vitest run tests/integration/catalog/` — 24 files and 39 tests passed; full output is in [catalog-integration.log](catalog-integration.log).
- `npx eslint catalog/kits/mining/ tests/integration/catalog/mineSkipCappelMaterials.test.ts` — clean.
- The regenerated [index row](index-row.after.json) matches the source SHA-256 and places `cappel` under `structuralSteel`.
- [Open-target searches](open-target-searches.json) returned no matching open issues or PRs for the five sampled assets; [open mining source paths](open-pr-mining-paths.json) is empty.

## Live site state

The live asset library currently serves a legacy 172-triangle box-like mine-skip preview, while this local source builds the 1,490-triangle conveyance. The asset-library listing loads, but the tested detail URL returns 404. This change has not been deployed; the live asset is not evidence of the local correction.

This is source, render, and regression evidence only. It does not establish capacity, strength, safe operation, standards compliance, deployment, or physical acceptance.
