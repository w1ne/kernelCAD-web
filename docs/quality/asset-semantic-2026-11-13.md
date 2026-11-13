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
