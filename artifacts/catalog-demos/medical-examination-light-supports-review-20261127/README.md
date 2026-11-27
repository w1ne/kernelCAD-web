# Examination-light support connection review — 2026-11-27

**Demo:** [15-second local review MP4](video/review-demo.mp4) · [before preview](before/examination-light.png) · [after preview](after/examination-light.png) · [video inspection](video/video-review/inspection.json)

## Result

`medical/examination-light` now has continuous support geometry at the mast-to-arm and neck-to-head joints. Before, the column ended 7 mm below the arm, and the neck ended below the lamp head. The edited mast overlaps the arm; the angled neck reaches inside the lamp housing. The 368-triangle model remains within its 450-triangle budget.

The four colour controls, `clinic` and `emergency` presets, overall dimensions, and asset ID are unchanged. The source SHA in `catalog/index.json` is `4b91a900b0f45e4b00feddf54420a37b4d7414d86f47d211750297387bbb35f8`.

## Evidence

- The focused GLB integration test checks the three support intersections at scales 0.65, 1.0 and 1.35, both authored palettes, the triangle budget and the published dimensions.
- `npx tsx scripts/renderCatalogPreviews.ts examination-light` regenerated the catalog preview (`368 tris`). `npx tsx scripts/buildAssetCatalog.ts` regenerated the index; no further index diff was needed because the source hash already matched.
- `kernelcad render inspect` was attempted with the existing Chrome CDP sessions on ports 9222 and 9223 and a 180-second command limit. Both Playwright attachments timed out after connecting; no replacement browser was started. The rendered catalog before/after previews remain the visual evidence in this bundle.
- The video is built from the two actual rendered previews and the recorded geometry-test scope. `demo-settings.json` and `video/make_demo.py` retain its invocation and settings. `video/inspect_video.py` records frame, duration, resolution and codec checks.

## Limits

Local source, GLB geometry checks, and software-rendered catalog previews only. This is not a deployment check, clinical-use assessment, hardware acceptance, or engineering certification.
