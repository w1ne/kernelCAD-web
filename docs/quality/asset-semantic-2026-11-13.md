# Asset semantic review — 2026-11-13

## Gate and sample

PR #1258 was open at baseline head a5cdd48795aab954f093077c62f55b43c505e503. All 17 reported checks passed, and no review had been submitted. Exact open issue and open PR searches for the five selected mining asset IDs returned no results; PR #1258 is the destination for this change.

I inspected the rendered previews for longwall-shearer, mine-ventilation-fan, spiral-concentrator, gyratory-crusher-station and jaw-crusher-module. The sample, measured envelopes and observations are recorded in the [five-preview ledger](../../artifacts/catalog-demos/mining-longwall-shearer-pick-material-review-20261113/preview-ledger.md).

## Finding and correction

The longwall shearer reads as a double-ended machine on an armoured face conveyor, but its 24 vane picks and 16 face picks used the conveyor/shield steel control. The asset already defines a separate drum/pick steel control. Both cutter-pick loops now use that existing control. Geometry, 3,504-triangle count, 20 × 3.35 × 5.85 m envelope, parameters, presets and asset count are unchanged.

The other four previews read as their named mining equipment, with no valid material mismatch found. No source or preview outside the longwall shearer changed.

## Verification

- Focused exported-GLB regression: 1/1 passed; it checks all 40 cutter-pick nodes, material-zone mapping, preset values, triangle count and envelope.
- Mining ESLint: clean.
- Mining mechanical quality gate: 50/50 assets pass (100%). This structural check does not establish semantic realism.
- Catalog integration coverage: all 53 files / 86 tests passed across retained runs. The aggregate run completed 52 files / 84 tests before SIGTERM; the remaining exhaustive `catalogIndex.test.ts` then passed separately (2/2), including the full 2,402-asset build and index-freshness check. The [handoff bundle](../../artifacts/catalog-demos/mining-longwall-shearer-pick-material-review-20261113/README.md) preserves the command history and logs, along with global mechanical-gate results.
- Target preview was regenerated and catalog/index.json rebuilt from sources. The verifier found only the longwall-shearer row changed, with a fresh source SHA and existing preview path.

The [handoff bundle](../../artifacts/catalog-demos/mining-longwall-shearer-pick-material-review-20261113/README.md) retains before/after source and previews, the five-preview sample, local verification logs and an inspected MP4. The public route currently serves the older 224-triangle render; this branch is not deployed. Local previews and GLB tests show authored catalog behavior only, not mine-process simulation or equipment acceptance.

## Telecom grounding busbar conductor material

- Baseline PR #1258 head `c325a1958`, 17/17 checks passed. No open PR touches the telecom-infrastructure kit; no open issue or PR matches "grounding". The kit had no earlier semantic review.
- Reviewed `grounding-bar`, `grounding-rod-kit`, `lightning-air-terminal`, `waveguide-bridge`, `microwave-dish-antenna`. All five read as their named objects.
- `grounding-bar` coloured the conductor bar with `galvanizedSteel`; only the stub studs were copper. A telecom grounding busbar is a solid copper bar on standoff insulators. The bar now uses `copper`; the studs use a new `stainlessSteel` control; the unused `galvanizedSteel` control was removed. Geometry unchanged at 300 triangles.
- Recorded, not fixed: powder-coated base plate on `lightning-air-terminal`.
- Evidence: [review bundle](../../artifacts/catalog-demos/telecom-grounding-busbar-copper-material-review-20261113/README.md).
- Verification: focused exported-GLB test 1/1 passed and fails on the old source; ESLint clean; telecom-infrastructure structural gate 56/56; `tests/integration/catalog/` 54 files / 87 tests passed in 621 s; rebuilt index has 2,402 assets / 50 kits, no source-hash mismatches, and only the grounding-bar row changed. No MP4 was produced for this colour-only correction.

## Recycling two-ram baler power-pack motor material

- Baseline PR #1258 head `c92775273`, all reported checks passed. No open PR or issue targets the recycling-facility kit; none of the sampled IDs appear in earlier ledgers.
- Reviewed `magnetic-drum-separator`, `granulator`, `horizontal-baler`, `baghouse-collector`, `compost-trommel-screen`. All five read as their named machines, with no valid material mismatch. A colour-zone scan of five more unreviewed machines found the defect in `two-ram-baler`.
- `two-ram-baler` coloured the power-pack electric motors with the `hydraulics` control ("Hydraulic cylinders (steel)"), so they rendered as bright rams. They now use a new `motorPaint` control in all four presets. Geometry unchanged at 1,866 triangles.
- Recorded, not fixed: the trommel mesh core is a fixed dark tone outside the drum control; the `tieWire` label names rollers that use `hydraulics` (both steel, render correct).
- Verification: focused GLB test fails on the old source and passes on the new; ESLint clean; recycling-facility gate 153/153; `tests/integration/catalog/` 62 files / 107 tests passed; index rebuilt with only the two-ram-baler row changed.
- Evidence: [review bundle](../../artifacts/catalog-demos/recycling-two-ram-baler-motor-material-review-20261113/README.md).

## Cartridge filter housing nozzle material

- Baseline PR #1258 head `35a66c640`; at capture 1 check passed and 15 were pending. No open PR or issue targets the five sampled IDs; none appear in earlier review bundles.
- Reviewed `industrial-plant/cartridge-filter-housing`, `industrial-plant/gantry-crane`, `water-treatment/belt-filter-press`, `shipyard/abrasive-blast-pot`, `grid-substation/substation-busbar-expansion-joint`. All five read as their named objects.
- `cartridge-filter-housing` coloured the lid outlet and side inlet nozzles with `safetyPaint`, while the inlet flange on the same neck used `steel`. Both nozzles now use `steel`. Geometry unchanged at 476 triangles.
- Recorded, not fixed (geometry, not material): gantry-crane legs do not meet the bridge beam and casters sit mid-rail; abrasive-blast-pot vessel floats between the wheels with no axle or frame; busbar-expansion-joint insulators are buried in the supports; the cartridge filter description names a drain that the model does not have.
- Verification: focused GLB test fails on the old source and passes on the new; ESLint clean; industrial-plant gate 60/60; `tests/integration/catalog/` 63 files / 108 tests passed; index rebuilt with only the cartridge-filter-housing row changed.
- Evidence: [review bundle](../../artifacts/catalog-demos/industrial-cartridge-filter-nozzle-material-review-20261113/README.md).

## Sanitary filter skid housing material

- Baseline PR #1258 head `d4b1913aa`; at capture the completed checks passed and the `test` job was pending. No open PR or issue targets the five sampled IDs; none appear in earlier ledgers or review bundles.
- Reviewed `beverage-bottling-line/sanitary-filter-skid`, `rotary-capper`, `cip-supply-return-skid`, `shrink-bundle-wrapper`, `case-erector`. All five read as their named machine type.
- `sanitary-filter-skid` painted both cartridge housings with `powderCoat`, because the shared paint regex matched `housing`. The asset's own text says stainless housings. The token is removed from this file's regex; the housings now use `stainlessSteel`. Geometry unchanged at 360 triangles.
- Recorded, not fixed (geometry): the skid's inlet and outlet headers are vertical poles, not horizontal pipes, and its description names a drain that the model does not have; the CIP skid headers are also vertical poles; the shrink wrapper has no film web or bundle; the case erector magazine holds no blanks.
- Verification: focused GLB test fails on the old source and passes on the new; ESLint clean; beverage-bottling-line gate 50/50; `tests/integration/catalog/` 64 files / 109 tests passed; index rebuilt with only the sanitary-filter-skid row changed.
- Evidence: [review bundle](../../artifacts/catalog-demos/beverage-sanitary-filter-housing-material-review-20261113/README.md).

## Recycling glass-screening motor-cap material

- Baseline PR #1258 head `a8588e6d8` had all reported CI checks passing; no submitted review was listed. Exact open issue/PR title/body searches and changed-path checks found no competing target for the five sample IDs; #1258 is the destination.
- Reviewed `bag-opener`, `cross-belt-sorter`, `disc-screen`, `glass-screening-deck`, and `bottle-cleaning-line`. Four showed no valid material mismatch. In `glass-screening-deck`, both motor end caps used the orange polyurethane screen-panel material while the motor bodies were dark.
- Both end caps now use the existing dark motor finish. Geometry, dimensions, controls, presets, triangle budget and catalog identity are unchanged. The orange screen panels remain on their existing control.
- The baseline-focused GLB regression fails on the old palette assignment; the corrected model passes. Recycling-facility's structural gate is 153/153 (100%). The generated index retains 2,402 rows, with one changed row, a matching source SHA-256, and an existing preview.
- Verification: recycling-facility ESLint clean; `tests/integration/catalog/` passed 69 files / 114 tests, including the exhaustive source/export/index freshness check.
- The [review bundle](../../artifacts/catalog-demos/recycling-glass-screening-motor-cap-material-review-20261113/README.md) contains the five-preview ledger, before/after source and renders, demo, and verification evidence.

## Construction asphalt-distributor spray-bar material

- Baseline PR #1258 head `21ba047b6`, all reported checks passing. No open PR touches the construction-equipment kit; none of the five sampled IDs appear in earlier ledgers or review bundles.
- Reviewed `cold-planer-milling-machine`, `concrete-pump-truck`, `portable-air-compressor`, `rough-terrain-forklift`, `asphalt-distributor-truck`. Four read as their named machine; the cold planer reads only as a generic crawler machine.
- `asphalt-distributor-truck` coloured the rear spray bar and its nine nozzles with `equipmentPaintColor`, the yellow enamel of the tank and cab. A distributor spray bar is a bare-steel pipe manifold. The ten parts now use the existing `structuralSteelColor` control. Geometry unchanged at 1,196 triangles.
- Recorded, not fixed: the cold planer has no loading conveyor, and its hidden cutter teeth use enamel; the concrete pump's rear outrigger pads use enamel and the front pad steel; the compressor tyres intersect the enclosure; the spray bar floats behind the chassis with no mounting arms. The kit's sampled vehicles are 1.0–1.8 m long, about 1:5 to 1:8 of real size.
- Verification: focused GLB test fails on the old source and passes on the new; ESLint clean; construction-equipment gate 60/60; `tests/integration/catalog/` 70 files / 115 tests passed; index rebuilt with 2,402 rows and only the asphalt-distributor-truck row changed (`sourceSha256`, `palette`).
- Evidence: [review bundle](../../artifacts/catalog-demos/construction-asphalt-spray-bar-material-review-20261113/README.md).
