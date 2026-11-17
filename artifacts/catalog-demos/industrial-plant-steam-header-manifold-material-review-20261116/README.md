# Steam header manifold material correction — 2026-11-16

The five-preview review and retained pre-edit baseline were captured on
2026-11-16; source, index, integration and video verification completed on
2026-11-17.

**Demo:** [15-second local source-to-preview MP4](industrial-plant-steam-header-manifold-material-review.mp4) · [before preview](before/steam-header-manifold.png) · [after preview](after/steam-header-manifold.png) · [five-preview audit ledger](preview-review.md)

## Finding and change

The published source and preview for `industrial-plant/steam-header-manifold`
matched the retained pre-edit files byte-for-byte. The five branch risers were
colored with the safety-paint control even though the header and valve bodies
were steel. The existing branch pipe geometry now uses the asset's existing
`steel` control. The handwheels and support skid remain safety-painted. No
geometry, asset ID, kit membership, parameter, preset, or triangle budget
changed. The preview has **980 triangles / 1,400 budget**.

The five-preview review left the distillation column, screw conveyor, vibratory
feeder and diesel generator set unchanged. The corrected preview also exposes a
separate layout follow-up: the support skid sits below the header with a visible
gap. That geometry was not changed in this material-only pass.

The dated product and CAD workflow comparison is kept in private review notes.
This public handoff describes the native kernelCAD source, material controls,
presets, renderer, and verification only.

## Verification

- The new GLB regression failed before the source change because `branch-0`
  used the safety-paint color; it now passes for all five steel risers and
  confirms the skid and valve handles retain safety paint.
- The full catalog integration suite passed **127 files / 197 tests**, including
  its full 2,402-asset index rebuild.
- ESLint passed for the industrial-plant kit and this regression test.
- Industrial-plant quality gate: **60/60 (100.00%)**. Catalog-wide structural
  quality is **2,398/2,402 (99.83%)**; four unrelated thin assets remain in
  standard-components and the global command exits 1 for those assets.
- The hosted geometry check passes with `skipMechanismCheck: true`: 23 named
  parts, 47 features, 72 faces, a 920 × 310 × 373.8 mm bbox, and no diagnostics.
  A default hosted mechanism check reports interpenetration diagnostics where
  static pipe bodies meet the header; this is not a motion or physical test.
- The catalog index is regenerated. [Index verification](index-verification.json)
  checks the source SHA-256, preview path, one changed row, and unchanged asset
  IDs. The local detail page and copied preview are checked separately.
- The live public page and preview were checked before editing and rechecked
  after the local change. This branch is not deployed; the live page remains on
  the pre-edit preview.
- The MP4 settings, capture source and decoded-frame inspection are retained in
  [demo-settings.json](demo-settings.json), [capture_demo.py](capture_demo.py)
  and [video-review/inspection.json](video-review/inspection.json). The video
  is H.264 at 1280×720 for 15 seconds. I visually inspected the five-frame
  decoded contact sheet; the before/after pipe colors, five-item audit and
  verification text are visible and readable. It shows local source rendering
  and validation only; no deployment, simulation, engineering performance or
  hardware acceptance is claimed.

## Reproduce

From the repository root:

```sh
python3 artifacts/catalog-demos/industrial-plant-steam-header-manifold-material-review-20261116/record_public_hashes.py
npx tsx scripts/renderCatalogPreviews.ts steam-header-manifold
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/industrial-plant-steam-header-manifold-material-review-20261116/verify_asset_index.py
npx vitest run tests/integration/catalog/steamHeaderManifoldBranchMaterial.test.ts
npx vitest run tests/integration/catalog/
npx eslint catalog/kits/industrial-plant/ tests/integration/catalog/steamHeaderManifoldBranchMaterial.test.ts
python3 scripts/checkCatalogQuality.py --kit industrial-plant
python3 scripts/checkCatalogQuality.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-steam-header-pages-20261117
python3 artifacts/catalog-demos/industrial-plant-steam-header-manifold-material-review-20261116/verify_local_page.py /tmp/kernelcad-steam-header-pages-20261117
python3 artifacts/catalog-demos/industrial-plant-steam-header-manifold-material-review-20261116/capture_demo.py
python3 artifacts/catalog-demos/industrial-plant-steam-header-manifold-material-review-20261116/inspect_video.py
```

The dated comparisons and demo sources stay distinct from deployed behavior.
