# Rear-door heat exchanger copper material review — 12 November 2026

## Review scope

PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was checked before
editing at `7488c42641c91aaca8f7bb00bba35934ae4d2973`: all 17 reported CI checks
were successful, the merge state was `CLEAN`, and no review had been submitted.
The five-preview sample was selected after checking open issue/PR targets and
paginated source diffs. No competing match was found.

The sample includes the rotary blasthole drill and shaft headframe from mining,
the concrete batch plant and towable light tower from construction equipment,
and the rear-door heat exchanger from data-center infrastructure. All five
branch previews were opened and read as the labeled object. The first four had
no established material mismatch. In the heat exchanger, nine exposed tube runs
shared the painted-steel finish and were difficult to distinguish. They now use
a named copper control; the frame and door stay steel, and outlet fittings stay
polymer.

The correction adds `copper` (`#bd7748`) and exposes it in both existing presets.
It changes no geometry: the asset remains 532 triangles, under its 2,200 budget,
with a 0.885 × 2.1 × 0.61 m envelope. The focused exported-GLB regression checks
the nine copper runs, existing steel/polymer assignments, both presets, triangle
count, and envelope.

## Verification

- `npx eslint catalog/kits/data-center-infrastructure/ tests/integration/catalog/rearDoorHeatExchangerCopperMaterial.test.ts`
- `npx vitest run tests/integration/catalog/rearDoorHeatExchangerCopperMaterial.test.ts`
- `npx vitest run tests/integration/catalog/`
- Full result: 42 files / 67 tests passed, including the 2,402-asset export
  and committed-index freshness check. The copper material regression passed
  within that suite.
- `python3 verify_asset_index.py` checks the generated index row, all referenced
  previews, the 2,402 asset / 50 kit totals, and that only the target index row
  changed.
- `python3 verify_local_page.py /tmp/kernelcad-rear-door-copper-pages` checks
  the generated detail page and copied preview.
- All five current public preview, source, and detail routes returned HTTP 200.
  The public target still matches its pre-change baseline; this branch has not
  been deployed.

The generated index has a fresh target source hash and preview path. Its updated
target hashes are recorded in `index-verification.json`. Full test and lint logs,
source/render hashes, live baseline snapshots, and exact duplicate-target scan
output are retained in this bundle.

## Review walkthrough

[View the 18-second MP4](data-center-rear-door-heat-exchanger-copper-material-review.mp4).
It shows the five preview sample, the heat exchanger before and after, the native
material controls/presets, and local checks. Captions describe branch-local
preview/source/index work; they do not claim deployment, simulation, or hardware
acceptance.

Recreate it with:

```bash
python3 artifacts/catalog-demos/data-center-rear-door-heat-exchanger-copper-material-review-20261112/capture_demo.py
```

The script, `demo-settings.json`, slide PNG inputs, ffmpeg invocation output,
probed metadata, extracted review frames, and visual inspection notes are
retained. The official material documentation comparison is recorded privately
in `kernelCAD-private`.

## Retained evidence

- `sample/`: the exact five baseline `.kcad.ts` sources and previews opened in
  the audit.
- `before/` and `after/`: target source/render snapshots around the correction.
- `live-baseline/`, `public-route-check.json`, and `baseline-manifest.json`:
  current public sources/previews/pages, HTTP status, and source/render hashes.
- `open-target-check.json`: exact open issues, PR text searches, and paginated
  competing source-file scan.
- `index-verification.json`, `local-page-check.txt`, and command logs: generated
  index, page, lint, and integration evidence.
- `video-inputs/` and `video-review/`: demo source frames and inspected MP4
  evidence.

This is a visual catalog/material assignment correction only. It does not
validate supplier dimensions, cooling performance, process safety, deployment,
simulation, or physical acceptance.
