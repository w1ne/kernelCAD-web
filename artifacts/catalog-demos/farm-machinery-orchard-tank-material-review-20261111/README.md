# Farm machinery — orchard sprayer tank material review

This handoff records a five-preview semantic audit and a focused material-control correction to the existing `farm-machinery/orchard-air-blast-sprayer` asset.

## Audit ledger

| Asset | Rendered observation | Result |
|---|---|---|
| `orchard-air-blast-sprayer` | Before: chemical tank and chassis shared the green painted-steel control. After: the pale tank has a separate polymer control. The preview still does not show the axial fan or nozzle bank mentioned in the source description; this round changes material control only. | Material-control mismatch corrected; geometry unchanged. |
| `potato-harvester` | Boxy raised bunker and flat chassis dominate; separator web and digging assembly are not recognizable in the rendered view. Green painted steel and dark tires are coherent. | No material mismatch found; silhouette/detail concern remains separate. |
| `self-propelled-field-sprayer` | Central cab/body, four tires, and lateral booms are visible. The high-clearance stance and spray hardware are weak in this view. Paint, glass, exposed steel, and rubber are distinct. | No material mismatch found. |
| `grain-dryer` | Vented vertical tower, cap, base, and ladder rails read as a grain-dryer scene asset; painted structure and exposed steel are coherent. | No material mismatch found. |
| `farm-grain-auger` | Inclined tube, intake hopper, support rails, transport wheels, and feed material are visible. Painted steel, exposed steel, rubber, and crop material have plausible assignments. | No material mismatch found. |

Exact open issue and PR title/body searches found no matches for these asset IDs. None of the 17 other open PRs changed the five selected source paths. PR #1258 is the destination under review and is excluded only from the changed-source conflict check. The command and result are retained in [`check_open_targets.py`](check_open_targets.py) and [`verification/open-target-check.json`](verification/open-target-check.json). Source/preview hashes and observations are in [`sample-ledger.json`](sample-ledger.json).

## Correction

The `chemical-tank` part was assigned to `paintedSteelColor`, shared with the `sprayer-chassis` and `operator-cab`. It now has the material-named `tankPolymerColor` control with values in both existing presets. The chassis, cab, glass, rubber, wheel hubs, preset names, geometry, triangle budget, and asset identity are unchanged. The 400-triangle preview now shows the light tank separately from the painted chassis.

The generated index was rebuilt and its source hash matches the edited source. The updated row retains a 0.9964 × 1.68 × 1.78 m envelope and 400 triangles within the 2,200-triangle budget. See [`verification/index-verification.json`](verification/index-verification.json) and the retained [`before`](before/orchard-air-blast-sprayer.png) / [`after`](after/orchard-air-blast-sprayer.png) previews.

## Verification

- Focused GLB regression: passed (1/1); it checks palette partitioning, exported tank and chassis colors, both presets, triangle count, and envelope. Output: [`verification/focused-test-output.txt`](verification/focused-test-output.txt).
- Farm-machinery quality gate: 60/60 (100%).
- ESLint: clean for the farm-machinery kit and focused regression.
- Catalog integration suite: 28 files / 43 tests passed, including the all-asset fresh-index comparison; full output is in [`verification/catalog-integration-output.txt`](verification/catalog-integration-output.txt).
- Generated local detail page includes the tank-polymer control and both presets; its copied preview hash matches the checked-in source preview. See [`verification/local-page-verification.json`](verification/local-page-verification.json).
- The current PR #1258 head before this edit was `ab53fd09d49557505f43806b031bf27b6c88790a`. Its required workflow gates passed in [CI run 43048742152](https://github.com/w1ne/kernelCAD-web/actions/runs/43048742152); the optional external-tools job was still running during this audit. No review had been submitted.

## Local demo

The [20-second MP4](farm-machinery-orchard-tank-material-review.mp4) shows the five rendered previews, the original shared tank finish, the corrected preview, the authored color control, and local verification. [`create_demo.py`](create_demo.py), [`create-demo.sh`](create-demo.sh), and [`demo-settings.json`](demo-settings.json) retain the capture source and settings. [`video-inspection.json`](video-inspection.json) and the decoded review frames in [`video-review/`](video-review/) record the visual inspection.

Reproduce from the repository root:

```sh
npx tsx scripts/renderCatalogPreviews.ts orchard-air-blast-sprayer
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/farm-machinery/ tests/integration/catalog/orchardSprayerTankMaterial.test.ts
npx vitest run tests/integration/catalog/orchardSprayerTankMaterial.test.ts
npx vitest run tests/integration/catalog/
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit farm-machinery
bash artifacts/catalog-demos/farm-machinery-orchard-tank-material-review-20261111/create-demo.sh
```

The dated product-material comparison is stored privately in `kernelCAD-private/docs/competitors/2026-11-11-farm-orchard-sprayer-tank-material.md`. Public handoff language describes native kernelCAD source and preview behavior.

## Limits

This is a local authored-source preview, not a simulation, deployment, spray-performance evaluation, chemical compatibility assessment, safety review, or equipment acceptance. The fan/nozzle omission and the potato-harvester silhouette concern are recorded for future semantic review and are not claimed as fixed.
