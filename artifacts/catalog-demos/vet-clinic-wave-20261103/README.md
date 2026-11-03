# Veterinary clinic catalog wave

This bundle documents 50 original CC0 low-poly assets for a small animal
veterinary clinic. The scene covers reception and examination, treatment and
imaging, surgery and instrument processing, diagnostics, inpatient housing, and
grooming.

## Demo

[Watch the 30-second MP4 walkthrough](vet-clinic-kit.mp4). It shows the clinic
work areas, native `.kcad.ts` source and controls, a rendered parameter variant,
all 50 catalog previews, and local verification results. The video is H.264,
1280 × 720, 24 fps, `yuv420p`. Its decoded 10-frame contact sheet was visually
inspected and recorded in [video-inspection.json](video-review/video-inspection.json)
and [contact-sheet.png](video-review/contact-sheet.png).

## Results

- The generated catalog contains **2,100 assets across 45 kits**. All 2,100
  rows have preview paths and corresponding PNG files.
- All 50 clinic sources build. They use one material, expose `scale` and
  `color`, stay within the 1,800-triangle budget, and match their indexed source
  hashes. Their meshes range from 84 to 488 triangles. Floor-placed assets have
  a base origin at z = 0; the dental X-ray arm and kennel feeding bowl rail use
  wall origins.
- All 50 clinic previews were rendered and visually reviewed. The locally
  generated catalog hub lists the kit; all 50 clinic detail pages and preview
  copies passed verification.
- `npx eslint catalog/` passed. `npx vitest run tests/integration/catalog/`
  passed **4 files and 15 tests**.
- `npm run build` passed. It emitted the existing `vendor/verb-nurbs` warning
  about equality comparison with `NaN`.
- `npm pack --dry-run --ignore-scripts --json` includes the 50 clinic source
  files, 50 preview PNGs, and generated catalog index. The package file list has
  no product-specific commercial paths; the package export map remains
  `./package.json`.

Per-asset evidence is in [asset-check-results.json](asset-check-results.json),
with the full [source audit](source-audit.json),
[catalog test output](catalog-test-output.txt),
[local page check](catalog-pages-check.json),
[npm package audit](npm-pack-audit.json),
[dry-run file list](npm-pack-dry-run.json),
[source and built-package boundary audit](source-build-boundary-audit.json), and
[settings and invocations](settings.json).

## Reproduction

From the repository root, with Node 22.23.4:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/vet-clinic-wave-20261103/generate_vet_clinic_assets.py
npx eslint catalog/ --fix
npx eslint catalog/
```

For catalog geometry commands in this environment, the compatibility wrapper
temporarily adapts the installed OpenCascade module and restores its package
metadata after each command. The catalog was built, rendered, and rebuilt with:

```bash
python3 artifacts/catalog-demos/vet-clinic-wave-20261103/run_with_occt_cjs_compat.py --output catalog-build-output.txt -- npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/vet-clinic-wave-20261103/render_vet_clinic_previews.py
python3 artifacts/catalog-demos/vet-clinic-wave-20261103/run_with_occt_cjs_compat.py --output catalog-build-output.txt -- npx tsx scripts/buildAssetCatalog.ts
```

The source audit, preview renderer, variant renderer, page verifier, video
capture and inspection scripts are retained alongside their output logs and
reports in this directory.

## Website and acceptance status

The read-only live baseline was recorded at 2026-11-03 11:26 UTC using the
existing Chrome CDP session: the homepage and `/assets.json` returned HTTP 200;
`/catalog/` returned HTTP 404. The deployed homepage data had 1,291 previewed
rows across 31 kits and no veterinary-clinic rows. This branch was not deployed
when checked. Local page generation and replay do not establish deployed
visibility, clinical suitability, equipment ratings, safety, hygiene,
calibration, regulatory compliance, or physical acceptance. Public page
verification remains pending merge and deployment.
