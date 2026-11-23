# Telecom infrastructure quality promotion — 2026-11-05

## Handoff

Promoted the 56 existing `telecom-infrastructure` assets in place. Each now has
2–4 material-named color controls and two named palettes (`fieldSite` and
`highVisibility`), with object-specific geometry and comments. The promotion
added no catalog IDs. Each asset stays within the 900-triangle budget; measured
assets range from 48 to 476 triangles.

The kit quality gate passed **56/56**, with all 56 previews present and indexed.
ESLint and the catalog integration suite passed. Local page generation checked
all 2,390 catalog rows and verified 56 telecom page/preview pairs. The catalog
quality score moved from **1,240/2,390 (51.88% pass; 1,150 thin)** to
**1,296/2,390 (54.23% pass; 1,094 thin)**. The full-catalog quality command is
a report and exits 1 because thin assets remain in other kits.

## Demo

- [18-second MP4](telecom-infrastructure-quality-promotion.mp4)
- [Poster](poster.png)
- [Decoded video contact sheet](decoded-video-contact-sheet.png)
- [Video metadata](video-metadata.json) and [inspection report](video-inspection.json)
- [Preview review notes](preview-review.md)

The MP4 uses local software-rendered catalog previews and a source excerpt. It
shows source appearance before/after, preview readability, one evaluated
`highVisibility` preset, and local verification results. It does not show a live
deployment or establish RF behavior, installation suitability, regulatory
compliance, or hardware acceptance.

## Reproduction and evidence

- [Promotion source](promote_telecom_infrastructure.py)
- [Invocation, palettes, commands and claim boundaries](settings.json)
- [Base quality report](baseline-quality-output.txt) and [base command status](baseline-quality-status.json)
- [Generated promotion audit](promotion-audit.json)
- [Per-kit quality gate output](kit-quality-output.txt) and [status](kit-quality-status.json)
- [Catalog-wide quality report](quality-gate-full-output.txt) and [status](quality-gate-full-status.json)
- [ESLint output](catalog-eslint-output.txt) and [status](catalog-eslint-status.json)
- [Integration output](catalog-test-output.txt) and [status](catalog-test-status.json)
- [Local page verification](catalog-pages-check.json) and [status](catalog-pages-status.json)
- [Preset render source](render_telecom_variant.mts), [resolved preview](variants/fiber-distribution-cabinet-highVisibility.png), and [verification](variant-verification.json)
- [Video capture source](capture_telecom_demo.py) and [inspection source](inspect_telecom_video.py)
- [Before previews](before/) captured from the starting revision

The source transformation is reproducible from the recorded starting revision
`c139f259735a6dc8945a40801ded3ee68248ce9d` with:

```bash
python artifacts/catalog-demos/telecom-infrastructure-quality-promotion-20261105/promote_telecom_infrastructure.py
```

After authoring, the required preview and index commands are
`npx tsx scripts/renderCatalogPreviews.ts <asset IDs>` and
`npx tsx scripts/buildAssetCatalog.ts`. `settings.json` records the lint,
quality, integration, local-page, preset-render and video commands.

## Catalog references

- [Telecom kit catalog README](../../../catalog/kits/telecom-infrastructure/README.md)
- [Catalog asset documentation](../../../docs/catalog-assets.md)

Local behavior is verified on this feature branch; the branch has not been
deployed, and live behavior remains unverified.

## Untracked generated outputs

`frames/` is not tracked in git; it is regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/telecom-infrastructure-quality-promotion-20261105/capture_telecom_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
