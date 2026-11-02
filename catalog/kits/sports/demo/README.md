# Sports kit demo bundle

[Watch the 15-second workflow and result](workflow.mp4) · [Poster](poster.png) · [40-asset contact sheet](asset-contact-sheet.png)

The video shows this wave's real source set, generated previews, and local validation results. It was rendered from the PNG previews produced from the final `.kcad.ts` sources. The contact sheet labels all 40 assets.

## Reproduce

From the repository root, run `bash catalog/kits/sports/demo/make-demo.sh`. The script writes `workflow.mp4`, `poster.png`, and `asset-contact-sheet.png`. Encoding and slide settings are recorded in [settings.json](settings.json), and caption text is retained in [captions](captions/).

## Source and evidence

- [make-demo.sh](make-demo.sh) — contact sheet, title and validation cards, and MP4 encoding source.
- [validate-assets.sh](validate-assets.sh) — per-file catalog validation invocation.
- [check-static-pages.py](check-static-pages.py) — checks each generated sports catalog page and preview.
- [checkCatalogAsset.log](checkCatalogAsset.log) — final result: 40/40 asset sources passed.
- [catalog-build.log](catalog-build.log) and [catalog-previews.log](catalog-previews.log) — generated index and preview command output.
- [catalogIndex-gate.log](catalogIndex-gate.log) — integration gate output.
- [catalog-pages.log](catalog-pages.log) and [static-pages.log](static-pages.log) — local static page generation and sports-page checks.

The static pages were generated locally from the updated index. Production page verification remains pending merge and deployment. The demo makes no claim of deployment or physical hardware acceptance.
