# PET blow molder enclosure material review — 17 November 2026

## Audit

The five-preview ledger is in [`preview-review.md`](preview-review.md), with the inspected baseline previews in [`samples/`](samples/). Candidate IDs were checked against open issues and PRs; the reproducible search and result are in [`verification/`](verification/).

## Finding and correction

The PET stretch blow molder's main body, service doors, and heating tunnel used the same stainless-steel control as the mold columns. The source now exposes `enclosureCoat` as a separate light-gray material control and retains `stainlessSteel` for mold hardware and `powderCoat` for the base and control pedestal. The model keeps its existing geometry, dimensions, asset ID, two presets, and 2,200-triangle budget.

## Before and after

- Baseline preview: [`previews/before/pet-blow-molder.png`](previews/before/pet-blow-molder.png)
- Updated preview: [`previews/after/pet-blow-molder.png`](previews/after/pet-blow-molder.png)
- Before and after source snapshots: [`sources/`](sources/)

## Verification

- The asset-specific exported-GLB regression checks three material controls, both presets, the unchanged 364-triangle count, and the expected finishes on the enclosure, mold columns, base, and control pedestal. Focused and full catalog test status is recorded in `verification/`.
- The kit-level quality gate reports 50/50 assets passing. The catalog-wide gate reports 2,398/2,402 (99.83%); its four existing thin assets are in `standard-components`.
- The rendered preview was regenerated from the `.kcad.ts` source and visually reviewed. `catalog/index.json` was regenerated from source in the same change.
- The current public detail page and preview returned HTTP 200 before this change; the public preview matched the local baseline by SHA-256. This branch is not deployed, so the website still shows the baseline material assignment.

## Demo

[Watch the local MP4 review](beverage-pet-blow-molder-enclosure-material-review.mp4). The video source and settings are `make_demo.sh` and `demo-settings.json`; frame inspection and media metadata are in `video-review/`.

The demo shows local software-rendered previews and regression evidence only. It does not show simulation, deployed behavior, or hardware acceptance.
