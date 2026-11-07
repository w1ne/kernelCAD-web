# Veterinary clinic quality promotion

[Watch the 20-second source-to-preview walkthrough](vet-clinic-quality-promotion.mp4).

This round promoted all 50 existing `vet-clinic` assets in place. It added 146
material-named color controls (two to four per asset), two named presets per
asset (`clinicClean` / `softTeal`, 100 preset entries), refreshed all 50
previews, and regenerated `catalog/index.json`. No IDs were added or renamed.
Scale controls and 1,800-triangle ceilings remain in place. The anesthesia
machine now shows two side-mounted oxygen cylinders, valve caps, a separate
monitor screen, and different painted-steel, stainless-steel, glass, and rubber
surfaces.

## Results

- The kit quality gate passes **50/50 assets**. Every asset exposes two to four
  material-named controls and a `presets()` block.
- The whole-catalog quality gate moved from **1,504/2,390 (62.93%)** to
  **1,554/2,390 (65.02%)**. The catalog has 836 thin assets remaining (34.98%);
  these counts are reported with the pass rate.
- All 50 previews were rendered from the native sources. Three default previews
  were reviewed at full size: the anesthesia workstation reads from its gas
  cylinders, display, and wheeled base; the kennel bank reads as three barred
  bays; the incubator reads from its chamber and viewing panel. See
  [preview review](preview-review.md).
- The generated local hub lists the kit; all 50 detail pages, preview copies,
  and source hashes passed verification. The catalog integration suite passed
  **4 files and 15 tests**, including the complete source-hash/index check.
- A hosted kernelCAD evaluation of the anesthesia machine reported valid finite
  geometry, 17 parts, 75 faces, and no diagnostics. Default and both preset
  color-value renders were generated locally from the source. These are
  geometry and catalog checks, not physical or clinical acceptance.

## Handoff and evidence

- [Promoted kit source and controls](../../../catalog/kits/vet-clinic/README.md)
- [Source promotion script](promote_vet_clinic_quality.py)
- [Preset render script](render_vet_clinic_presets.ts) and [preset renders](presets/)
- [Before previews](before/) and [capture source](capture_vet_clinic_quality.py)
- [Capture settings](settings.json) and [exact invocations](invocations.txt)
- [Results](verification.json), [kit quality output](catalog-kit-quality-output.txt),
  [full quality output](catalog-quality-output.txt), [lint status](catalog-eslint-status.json),
  [integration status](catalog-test-status.json), and [generated-page check](catalog-pages-check.json)
- [Built npm package boundary audit](package-boundary-audit.json) and [audit script](audit_npm_package.py): the generated tarball contains all 50 sources/previews and the index, retains the existing exports, and has no product-specific implementation paths.
- [Rendered previews](../../../catalog/kits/vet-clinic/previews/)
- [MP4 inspection](video-inspection.json), [decoded contact sheet](video-review/contact-sheet.png),
  and [poster](poster.png)
- [Live website baseline](live-website-check.json): the current deployed site
  has 2,116 previewed rows and includes the pre-promotion versions of these 50
  IDs. This branch has not been deployed.

## Reproduction

Run from the repository root. The scripts retain the material assignment,
default preview, exact preset-color replay, local page verification, MP4 capture,
and inspection steps. The index is regenerated after previews so each row has a
fresh source hash and a preview path.

```sh
python3 artifacts/catalog-demos/vet-clinic-quality-promotion-20261105/promote_vet_clinic_quality.py
# Run the 50-ID command recorded in invocations.txt.
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit vet-clinic
npx eslint catalog/kits/vet-clinic/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-vet-clinic-catalog-pages
python3 artifacts/catalog-demos/vet-clinic-quality-promotion-20261105/verify_vet_clinic_quality_pages.py
npx tsx artifacts/catalog-demos/vet-clinic-quality-promotion-20261105/render_vet_clinic_presets.ts
python3 artifacts/catalog-demos/vet-clinic-quality-promotion-20261105/capture_vet_clinic_quality.py
python3 artifacts/catalog-demos/vet-clinic-quality-promotion-20261105/inspect_vet_clinic_quality_video.py
python3 artifacts/catalog-demos/vet-clinic-quality-promotion-20261105/audit_npm_package.py
```

## Scope and deployment status

These are CC0 visualization props. Local source evaluation, render, lint,
catalog tests, hashes, and generated pages describe this branch. The public
site still serves its prior catalog until this branch is merged and the
marketing surface is deployed. Clinical suitability, device ratings, patient
safety, hygiene, calibration, regulatory compliance, physical simulation, and
hardware acceptance were not evaluated.
