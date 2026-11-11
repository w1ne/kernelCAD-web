# Gusset bracket semantic-fidelity repair — 11 November 2026

This is a **CC0 low-poly scene prop**, not a manufacturer-defined bracket, FEA result, licensed weldment or load-rated fabrication drawing.

## Evidence

- Production `https://kernelcad.com/assets/standard-components-gusset-bracket.kcad.ts` and `.png` matched `origin/develop` byte for byte at the time of audit. Manifest `https://kernelcad.com/assets.json` reported `generatedAt = 2026-11-11T02:39:30.846Z` and 2,418 entries.
- Published source SHA-256: `20acff40cb86d0fbd983781f17d5c49f4b464926c40b4fcb1eba78b332612675`.
- Published PNG SHA-256: `53bdaa573cbbac43365f91fd2dc1282de18894643a61086cf9114fe7009684c6`.
- The old `gusset` triangle is in the wall's X-Z plane (and occupies only 5 mm of Y depth), not a diagonal web between the wall and forward toe. The source has no mounting holes. Its 32-triangle preview conceals both faults.
- The corrected model has a **56 mm wide, 44 mm tall wall plate**, **40 mm deep toe** and **5 mm thick, triangular Y-Z plane web**. Plate faces contact at Y = −3 mm; web edges contact the toe top (Z = 6 mm) and wall inner face. Separate model parts represent the three pieces; the model does **not** include weld geometry.
- Four **Ø6.4 mm** through-holes are Boolean subtractions: wall at X = ±18 mm, Z = 31 mm; toe at X = ±18 mm, Y = −30 mm. Default whole-envelope size from exported GLB: **56 × 44 × 46 mm** in renderer X/Y/Z coordinates.
- Corrected default export **240 triangles** against budget **380**. The source, low-poly GLB and exact-source rendered PNG were checked. `before-after.jpg` compares the original live thumbnail with the locally rendered corrected thumbnail. `before-after.mp4` is a 6-second sequence of these actual source-derived renders, not a fabricated product photo.
- Added `tests/integration/catalog/gussetBracketFidelity.test.ts` with 2 tests for real ray-clear through-holes, adjacent solid metal, true diagonal web anchor vertices, full envelope and 0.75×/1.25× declared size extremes. The evaluator reported no error diagnostics in all three variants.

## Gates and release state

- Focused fidelity regression: 2/2 PASS.
- Exact `audit-assets.ts --only standard-components/gusset-bracket`: LOAD, KNOBS, MESH PASS.
- Focused ESLint: PASS. `git diff --check`: PASS.
- Existing lightweight catalog quality metric on checked `origin/develop`: **2,389/2,402 PASS**; 12 travel-gear assets and `standard-components/beam-coupling` were already below its colour-knob threshold. These are not caused by this patch. This metric does not establish engineering correctness.
- Full catalog integration and GitHub required checks: see PR status. Do not merge without gates and review. **Not deployed; public page still displays the old source and PNG.**

## Scope and handoff

This change affects exactly one existing `standard-components/gusset-bracket` source, its canonical PNG and index row, and adds one regression test plus this evidence bundle. No bulk rewrites, performance claims or changes to the 66-asset ledger PR #1279. Additional 11 live, high-visibility assets were reviewed separately in `/home/andrii/ventures/state/kernelcad-asset-review-20261111/sample-12/`, with source/PNG matches and native default evaluations recorded in the local ledger.
