# Reverse osmosis skid material review

**Date:** 2026-11-11
**Asset:** `water-treatment/reverse-osmosis-skid`
**Change:** Assign an editable glass-reinforced epoxy finish to the membrane-vessel shells, separate from stainless process piping.

## Finding

The before preview rendered the three membrane pressure-vessel shells with the
same stainless-steel finish as the process manifolds. The revised local preview
shows pale composite shells, stainless manifolds and teal-coated fittings as
separate material zones. The model geometry, dimensions, vessel count control,
triangle budget and preset names are unchanged.

The five-preview audit and exclusions are recorded in
[`preview-review.md`](preview-review.md). Source snapshots and both rendered
previews are retained in this bundle. The dated manufacturer material check is
kept in private `kernelCAD-private/docs/competitors/2026-11-11-water-treatment-ro-skid-material-reference.md`.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts reverse-osmosis-skid
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/reverseOsmosisSkidMaterials.test.ts
npx eslint catalog/kits/water-treatment/reverse-osmosis-skid.kcad.ts tests/integration/catalog/reverseOsmosisSkidMaterials.test.ts
python3 scripts/checkCatalogQuality.py --kit water-treatment
bash artifacts/catalog-demos/water-treatment-reverse-osmosis-material-review-20261111/build-demo.sh
```

The regression verifies the exported GLB assigns the composite finish to the
membrane shells, retains stainless color on the process manifolds, and exposes
the shell control in both presets. `demo.mp4` is a local before/after preview
comparison; it does not demonstrate deployment or hardware acceptance.

## Verification

Verification logs, source and preview hashes, the generated index row, and video
inspection frames are stored under `verification/` and `video-review/`.

- The full catalog integration suite passed: **18 files, 33 tests**, including
  the all-assets index/source-SHA check.
- ESLint passed for the water-treatment kit and the new regression test.
- The water-treatment quality gate passes **50/50 (100%)**. The catalog-wide
  structural scan reports **2,401/2,402 (99.96%)**; the one unchanged failure is
  `standard-components/beam-coupling`.
- The regenerated index changes only this asset row; its `sourceSha256` matches
  the edited source, and its preview path resolves. The model remains within its
  3,300-triangle budget at **2,660 triangles**.
- The inspected after preview shows three pale horizontal membrane shells on
  the dark skid, with separate stainless piping, teal fittings, and the side
  control cabinet. Geometry and dimensions are unchanged.

The change is on the open catalog PR branch and is not deployed. The local
source render and catalog build do not establish deployed behavior, vendor
geometry fidelity, pressure performance, or physical acceptance.
