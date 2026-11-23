# Office catalog quality promotion — 2026-11-06

**Demo:** [office-quality-demo.mp4](office-quality-demo.mp4) · [poster](poster.png)

The video follows the local `.kcad.ts` source-to-preview workflow: material
controls, two named palettes, before/after renders, actual preset exports, and
local catalog checks. It is generated from the checked-in sources and does not
show a live Studio session, deployment, product specifications, or physical
acceptance.

## Round result

- Promoted all **40 existing** office assets. No kit or asset IDs were added.
- Replaced the generic body/accent/detail color knobs with **120
  material-named controls** across the kit. Labels identify materials such as
  paperboard, polymer, steel, glass, rubber, timber, cork, fabric, and foam.
- Refreshed **80 named preset entries** as `professional` and `classroom`
  palettes, while preserving format and item-specific controls such as pages,
  shelves, rings, and tiers.
- Improved key silhouettes: scissors have two finger loops behind a brass
  pivot and open tapered blades; the [scissors detail follow-up](../office-scissors-detail-20261106/README.md)
  connects the handles to that pivot. The shredder has visible front casters,
  and the laminator has exposed feed rollers. The other models retain their
  named object parts such as clips, slots, trays, rails, handles, labels, and
  supports.
- Re-rendered **40/40 office previews** and rebuilt `catalog/index.json`. The
  verification record checks every source SHA-256, indexed preview path,
  generated preview file, and triangle count against its budget.
- The office quality gate passes **40/40**. Across the catalog, quality moved
  from **2,331/2,390 (97.5%; 59 thin)** to **2,371/2,390 (99.2%; 19 thin)**.
  The remaining thin assets are in other kits.
- `npx eslint catalog/kits/office/` passed. The catalog integration suite
  passed **4 files, 15 tests**. Local static-page generation built all 2,390
  catalog pages, and all 40 office pages were checked for their material
  controls and presets.
- The MP4 was probed and visually inspected. Its frames show the source
  controls, three before/after objects, two exact shredder presets, the revised
  scissors silhouette, a desk-object preview grid, and local check results.

The current kernelCAD homepage and existing catalog source were reviewed. This
feature branch is not deployed, so no post-deployment public page verification
is claimed. Local page evidence is in `local-page-check.json` and the generated
pages are under `/tmp/kernelcad-office-pages-20261106`.

## Reproduce the promotion

From a clean checkout at the promotion base (`c27b562f4`):

```sh
python3 artifacts/catalog-demos/office-quality-20261106/promote_office_quality.py
npx tsx scripts/renderCatalogPreviews.ts archive-box business-card-holder calculator clipboard desk-calendar desk-organizer dry-erase-board envelope-stack file-folder footrest fountain-pen hanging-file-folder highlighter hole-punch ink-pad label-maker laminator laptop-stand letter-sorter letter-tray marker mechanical-pencil memo-pad monitor-riser mousepad notebook office-pinboard paper-clip-dish paper-cutter paper-shredder paperweight pencil-cup ring-binder rubber-stamp ruler scissors stapler sticky-notes tape-dispenser wrist-rest
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/office/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-office-pages-20261106
npx tsx artifacts/catalog-demos/office-quality-20261106/render_office_presets.ts
python3 artifacts/catalog-demos/office-quality-20261106/record_office_verification.py
python3 artifacts/catalog-demos/office-quality-20261106/capture_office_quality_demo.py
python3 artifacts/catalog-demos/office-quality-20261106/inspect_office_video.py
```

[`promote_office_quality.py`](promote_office_quality.py) records the per-asset
material mappings and source edits. [`material-map.json`](material-map.json)
records source hashes, controls, presets, named parts, and triangle counts.
[`render_office_presets.ts`](render_office_presets.ts) exports the exact
`professional` and `classroom` presets for the shredder and scissors.
[`demo-settings.json`](demo-settings.json) stores video settings and exact
preview/preset invocations. [`verification.json`](verification.json) records
source/index/preview/page checks and catalog quality rates.

## Verification evidence

- [`check-results.json`](check-results.json), [`office-quality-output.txt`](office-quality-output.txt),
  and [`catalog-quality-output.txt`](catalog-quality-output.txt): command
  results and pass rates.
- [`preview-render-output.txt`](preview-render-output.txt) and
  [`catalog-build-output.txt`](catalog-build-output.txt): preview refresh and
  generated index.
- [`local-page-check.json`](local-page-check.json): generated page count and
  checks for all 40 office asset pages.
- [`before-previews/`](before-previews/), [`preset-variants/`](preset-variants/),
  `frames/`, [`video-inspection.json`](video-inspection.json), and
  [`video-review/`](video-review/): comparison images, actual preset renders,
  video source frames, decoded MP4 metadata, and visual inspection.

## Limits

These remain stylized low-poly visualization assets. Catalog evaluation and
local page generation do not establish commercial-product geometry, device
performance, safety or compliance, manufacturing suitability, deployed
behavior, or physical acceptance. The feature branch remains undeployed.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/office-quality-20261106/capture_office_quality_demo.py`
- video review: `python3 artifacts/catalog-demos/office-quality-20261106/inspect_office_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
