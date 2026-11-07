# Medical material quality round — 2026-11-06

**Demo:** [medical-materials-quality-demo.mp4](medical-materials-quality-demo.mp4) · [poster](poster.png)

The video shows the edited source controls, refreshed medical previews, exact
clinic/emergency preset renders for three assets, the flask silhouette update,
and local verification. It is a source-driven local demo; it does not show a
live Studio session or deployed behavior.

## Round result

- Refined all **40 existing medical assets**. No kit or asset ID was added,
  renamed or duplicated.
- Replaced generic shell/accent controls with **132 material-named controls**
  across polymer, steel, glass, upholstery, rubber, paper, gauze, silicone and
  other visible materials. The kit now averages **3.30 controls per asset**,
  up from 2.00; each source has two to four.
- Kept the clinic and emergency presets and updated them to set each material
  independently. The kit retains 80 named preset entries.
- Added small identifying details to five forms: a tapered Erlenmeyer loft
  with a liquid-level panel and graduations, an agar sample and label on the
  Petri dish, interior finger pads on the pulse oximeter, a paper label on the
  specimen cup, and a separate syringe plunger seal.
- The Erlenmeyer flask exports at **188 triangles / 260 budget**. Its source
  remains within budget; the other assets also remain within their existing
  triangle budgets.
- Refreshed and inspected all **40/40 previews**, then regenerated
  catalog/index.json from source. The whole-catalog gate remains
  **2,390/2,390 passing (100.00%; 0 thin assets)**; the medical kit is
  **40/40 passing**. This round changes quality, not count or pass rate.
- npx eslint catalog/kits/medical/ passed. The final catalog integration run
  passed **4 files / 15 tests**. The local static builder emitted 2,390 asset
  pages plus the hub; all 40 medical pages were checked for title, Open Graph
  title, heading, canonical URL, JSON-LD, material labels, preset names and
  copied preview hashes. Its CLI success line claims a sitemap and robots file
  were emitted, but the page writer intentionally leaves those site-owned files
  to the website build; the local output contains neither.
- The live baseline is preserved in
  [public-site-baseline.json](public-site-baseline.json): homepage and Studio
  route returned 200, while the catalog hub and medical asset page returned
  404; the sitemap had zero catalog paths. This branch is not deployed, so no
  post-deployment page verification is claimed.
- The MP4 is H.264, 1280×720, 18 seconds. Its six decoded frames and contact
  sheet were inspected. The initial integration attempt caught a stale flask
  source hash after its description was corrected; the index was rebuilt and
  the final full suite passed. Both runs are retained.

These are stylized visualization assets. The geometry and local checks do not
establish clinical device accuracy, manufacturing suitability, deployed
behavior, physical acceptance or hardware acceptance.

## Reproduce the local workflow

From the repository root on this feature branch:

    python3 -c 'import json; print(" ".join(a["asset"] for a in json.load(open("artifacts/catalog-demos/medical-materials-quality-20261106/material-map.json"))["assets"]))' | xargs npx tsx scripts/renderCatalogPreviews.ts
    npx tsx scripts/buildAssetCatalog.ts
    npx eslint catalog/kits/medical/
    npx vitest run tests/integration/catalog/
    npm run catalog:pages -- /tmp/medical-materials-catalog-pages-20261106
    npx tsx artifacts/catalog-demos/medical-materials-quality-20261106/render_medical_variants.ts
    python3 artifacts/catalog-demos/medical-materials-quality-20261106/record_medical_verification.py
    python3 artifacts/catalog-demos/medical-materials-quality-20261106/capture_medical_materials_demo.py
    python3 artifacts/catalog-demos/medical-materials-quality-20261106/inspect_medical_video.py

[material-map.json](material-map.json) lists every material control, default,
palette value and part assignment. The one-off
[promote_medical_materials.py](promote_medical_materials.py) preserves the
transformation recipe used from base 5e4313eed. The six exact preset exports
and their source hashes are in [preset-variants.json](preset-variants.json);
before/after views are in [before-previews/](before-previews/) and
catalog/kits/medical/previews/.

## Evidence

- [catalog-build-output.txt](catalog-build-output.txt),
  [preview-render-output.txt](preview-render-output.txt),
  [medical-quality-output.txt](medical-quality-output.txt),
  [catalog-quality-output.txt](catalog-quality-output.txt),
  [eslint-output.txt](eslint-output.txt),
  [integration-output.txt](integration-output.txt), and
  [local-pages-output.txt](local-pages-output.txt) retain command output.
- [local-page-check.json](local-page-check.json) records generated page and
  preview checks; [verification.json](verification.json) records source
  hashes, budgets, quality counts and command results.
- [integration-output-initial-stale-index.txt](integration-output-initial-stale-index.txt)
  preserves the first run, which caught the stale source hash before rebuild.
- [frames/](frames/), [video-inspection.json](video-inspection.json), and
  [video-review/](video-review/) retain the demo source frames, decoded frames,
  contact sheet and [visual review](video-review/visual-review.md).

The dated comparison of medical asset and device-design workflows is recorded
privately in kernelCAD-private; public catalog docs describe native kernelCAD
source behavior only.
