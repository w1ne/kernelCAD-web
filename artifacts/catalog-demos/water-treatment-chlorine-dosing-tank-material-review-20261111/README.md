# Chlorine dosing tank material review

This handoff records a five-preview audit and one material-control correction to the existing `water-treatment/chlorine-dosing-skid` catalog asset.

## Audit ledger

| Asset | Rendered observation | Result |
|---|---|---|
| `recycling-facility/ballistic-separator` | Inclined paddle deck, feed and fraction chutes, fines hopper, crank discs, and access rail are visible. Painted frame, deck steel, dark chutes, and yellow guards read as plausible zones. | No material mismatch found. |
| `wind-energy/wind-turbine-blade` | Tapered twisted composite blade stands on its bolted root. Pale composite, leading-edge strip, red warning band, and yellow steel stand are visually distinct. | No material mismatch found. |
| `water-treatment/chlorine-dosing-skid` | Day tank, metering-pump body, controls, stainless tube rack, and spill tray are visible. Before the correction, the day tank shared the coated-steel control with the pump and cabinet. | Material mismatch corrected. |
| `grid-substation/substation-oil-cooling-pump-skid` | Skid base, pump and motor pair, and raised suction/discharge runs are visible. Galvanized and stainless finishes are plausible. | No material mismatch found. |
| `mining/continuous-miner` | Low crawler body, cutter drum and pick rows, loading pan, conveyor, tail boom, and operator canopy read as a continuous miner. Machine paint, track steel, wear surfaces, and rubber/cable are separated. | No material mismatch found. |

Baseline source and preview hashes, envelopes, triangle counts, and the dated sample observations are retained in [`sample-ledger.json`](sample-ledger.json). [`open-target-check.json`](open-target-check.json) records exact open issue/PR searches and source/preview path checks. PR #1258 is the destination and is excluded only from the changed-source overlap check.

## Correction

The day tank now uses the material-named `chemicalTankPolyethylene` color control. The metering pump and cabinet remain on `coatedSteel`; the tray, tube rack, geometry, dimensions, asset identity, triangle budget, and two preset names remain unchanged. The default local render visibly separates the pale tank from the teal pump and control enclosure.

The [before preview](previews/before/chlorine-dosing-skid.png), [after preview](previews/after/chlorine-dosing-skid.png), and source snapshots are retained under [`source/`](source/). The generated catalog index updates only the chlorine-dosing-skid row and its source SHA-256 matches the edited source.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts chlorine-dosing-skid
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/water-treatment/ tests/integration/catalog/chlorineDosingSkidTankMaterials.test.ts
npx vitest run tests/integration/catalog/chlorineDosingSkidTankMaterials.test.ts
npx vitest run tests/integration/catalog/
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit water-treatment
bash artifacts/catalog-demos/water-treatment-chlorine-dosing-tank-material-review-20261111/create-demo.sh
```

The dated product-material and comparable CAD-workflow references are recorded privately in `kernelCAD-private/docs/competitors/2026-11-11-chlorine-dosing-skid-tank-material.md`. Public handoff language describes only the native kernelCAD asset source and preview behavior.

## Verification

- Focused GLB material regression: passed (1/1). It checks the day-tank, pump, and cabinet export colors, preset values, triangle count, budget, and envelope.
- Water-treatment quality gate: 50/50 (100%). Catalog-wide structural gate: 2,401/2,402 (99.96%); the unchanged outlier is `standard-components/beam-coupling`.
- ESLint: clean for the water-treatment kit and focused regression.
- Catalog integration suite: 29 files / 44 tests passed, including all-asset index freshness. Full output: [`verification/catalog-integration.log`](verification/catalog-integration.log).
- Local static build generated 2,402 asset pages; the chlorine-dosing-skid detail page contains the new control, existing presets, and a copied preview with a matching hash. See [`verification/local-page-verification.json`](verification/local-page-verification.json).
- Index generation, render, source hash, live-baseline check, PR/open-target state, and demo inspection evidence are retained under [`verification/`](verification/).

The public preview and source asset both returned HTTP 200 before editing and matched the checked-in baseline byte for byte. The branch is not deployed. The MP4 shows local source renders only; this change is not a chemical-compatibility assessment, process simulation, equipment-performance evaluation, deployment, or physical acceptance.

## Local demo

The [20-second MP4](water-treatment-chlorine-dosing-tank-material-review.mp4) shows the five previews, before and after material grouping, the native color control, and local verification. [`create_demo.py`](create_demo.py), [`create-demo.sh`](create-demo.sh), and [`demo-settings.json`](demo-settings.json) retain the capture source, invocation, and settings. Decoded inspection frames and the MP4 verification are retained under [`video-review/`](video-review/).
