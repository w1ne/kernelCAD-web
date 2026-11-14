# Postal logistics quality promotion — 2026-11-05

[Watch the 24-second local workflow demo](postal-logistics-quality-promotion.mp4).

This round promoted 52 existing postal-logistics models in place. It added no IDs. Each model now has two to four material-named color controls and `weathered` and `highVisibility` presets. Round loft profiles replace plain block helpers; rollers and handling wheels use faceted round profiles; the satchel has a tapered body, sloped flap, shoulder strap, and metal strap ends.

## Quality result

Before the round, the full catalog had **1,400/2,390 passing assets (59%)** and **990 thin assets (41%)**. Afterward, **1,452/2,390 pass (61%)** and **938 remain thin (39%)**. Postal logistics moved from 0/52 to 52/52 passing. The round added 166 material color controls across the kit—114 net controls beyond the replaced generic knobs—and 104 preset entries. All 52 previews were regenerated and indexed. Triangle counts range from 436 to 936 against the existing 1,800 budget.

The pre-round output is in [catalog-quality-before-round-output.txt](catalog-quality-before-round-output.txt); the final source, preview, triangle-budget, and quality audit is [promotion-audit.json](promotion-audit.json).

## Reproduction and verification

`settings.json` records the invocations and capture settings. The source transformation in [promote_postal_logistics_assets.py](promote_postal_logistics_assets.py) was run against unpromoted source files at baseline commit `b3527fd9d0c6c3d68eaeddb2cecdaed1e7b26879`; its outputs are now in the catalog sources. Preview IDs and the generation logs are retained alongside it.

The following checks completed successfully:

- `python3 scripts/checkCatalogQuality.py --kit postal-logistics`: 52/52 pass.
- `npx eslint catalog/kits/postal-logistics/`: exit 0.
- `npx vitest run tests/integration/catalog/`: 4 files and 15 tests passed, including all catalog source builds and index freshness.
- Local catalog-page generation produced 2,390 pages plus the hub and sitemap; [verify_postal_pages.py](verify_postal_pages.py) confirmed the 52 postal pages, previews, controls, and presets.
- [render_postal_variant.ts](render_postal_variant.ts) rendered the indexed `highVisibility` preset for the powered roller conveyor.

The [live website check](live-website-check.json), taken at 2026-11-05 08:33 UTC, records the production baseline separately: the public asset index had 2,116 rows and 52 postal previews, while the catalog hub and postal asset page returned 404. This branch change was not deployed.

## Visual evidence

- [Before/after previews](before/) retain the automated label applicator, carrier satchel, and sorting console samples.
- [High-visibility preset render](high-visibility-variants/powered-roller-conveyor.highVisibility.png) comes from the indexed preset values.
- Video review contact sheet (`video-review/contact-sheet.png`, not tracked) contains six decoded frames from the MP4. The capture and inspection sources are [capture_postal_demo.py](capture_postal_demo.py) and [inspect_postal_video.py](inspect_postal_video.py).

The demo shows local source edits, renders, preview/index generation, local page checks, and tests. It does not claim operational simulation, deployed behavior, machinery safety, manufacturing suitability, or physical acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/capture_postal_demo.py`
- video review: `python3 artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/inspect_postal_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
