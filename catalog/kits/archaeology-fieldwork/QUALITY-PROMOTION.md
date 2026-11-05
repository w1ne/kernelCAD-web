# Archaeology fieldwork quality promotion — 2026-11-05

All 50 existing archaeology-fieldwork assets were promoted in place. No IDs or
kits were added. Each asset retains its scale control and now has two to four
material-named color controls plus `fieldReady` and `weathered` presets. Across
the kit this adds 124 material controls and 100 preset entries.

The trowel now has a tapered pointed blade, the hand loupe has a visible glass
lens, and the total station has an objective lens and top display. The remaining
models retain their existing distinct field-tool silhouettes while their
materials are separated by component. Triangle counts range from 48 to 932,
within the existing 2,400-triangle budgets.

## Results

- Kit quality gate: 50/50 assets pass.
- Catalog quality: 1,904/2,390 assets pass (79.67%); 486 thin assets remain
  (20.33%). No catalog entries were added, removed, or renamed.
- Previews: all 50 rendered; every row has an indexed preview path and the
  generated PNG exists.
- `catalog/index.json`: regenerated after the final source and preview changes;
  all 50 source SHA-256 values match.
- ESLint: clean for `catalog/kits/archaeology-fieldwork/`.
- Catalog integration: 4 files and 15 tests passed.
- Local catalog pages: all 50 detail pages contain their parameter/preset
  details and copy the matching preview. The live catalog routes still return
  404; this branch follow-up is not deployed.

## Review and demo

The [quality-promotion bundle](../../../artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/README.md)
contains the transformation source, exact commands and settings, source/index
integrity audit, local checks, before/after previews, a rendered indexed preset,
the [preview review](../../../artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/preview-review.md),
and the inspected MP4. The final previews show a pointed steel trowel blade and
timber grip, a glass loupe lens within its rim, and a tripod-mounted total
station with a visible display and telescope.

The MP4 is a replay montage of source authoring and local software renders. It
shows local validation only; it does not show a simulation, deployed behavior,
or field/hardware acceptance. The original kit source-to-preview workflow is
documented in the [archaeology fieldwork wave bundle](../../../artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/README.md).
