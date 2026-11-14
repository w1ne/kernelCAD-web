# Transit mixer wheel material review — 11 November 2026

This handoff records a material-assignment correction to the existing
`construction-equipment/transit-mixer-truck` scene asset. The wheel helper
describes its six rims as steel but assigned them to the yellow equipment-paint
control. The rims now follow the existing `structuralSteelColor` parameter. The
cab and drum bands retain equipment paint; geometry, presets, dimensions,
triangle count and catalog count are unchanged.

## Five-preview audit ledger

| Asset | Rendered observation |
|---|---|
| `backhoe-loader` | Front loader bucket, glazed cab, rear excavator boom and stabilizers read as a backhoe loader; tires, paint and exposed steel are distinct. |
| `crawler-dozer` | Front blade, glazed cab, engine deck and crawler tracks are visible; painted panels, track steel and exposed structure are coherent. |
| `motor-grader` | Long articulated frame, cab, tandem rear axles, front steering axle and center moldboard read as a road grader; tires, paint and steel are distinct. |
| `skid-steer-loader` | Compact loader, lift arms, attachment bucket, protective cab and four tires read clearly; tire rubber, glazing, paint and cutting edge are distinct. |
| `transit-mixer-truck` | Before: six wheel rims shared the bright yellow equipment-paint control. After: the six steel rims use the gray structural-steel control; black tires and yellow cab/drum bands remain distinct. |

The selected source paths are unchanged by all 18 open asset PRs, and exact
searches found no matching open asset issue or PR. See
[`verification/open-target-check-output.txt`](verification/open-target-check-output.txt).

## Before and after

| Before | After |
|---|---|
| [Rendered preview](previews/before.png) | [Rendered preview](previews/after.png) |

The [12-second MP4](demo.mp4) shows the five-preview sample, then the transit
mixer before and after. It captures local catalog software renders and source
material assignment; it is not simulation, deployment or vehicle acceptance.

## Source and settings

- [Source before](source/transit-mixer-truck.before.kcad.ts) and [source after](source/transit-mixer-truck.after.kcad.ts)
- [Preview render settings and hashes](render-settings.json)
- [Five-preview sample hashes and observations](sample-ledger.json)
- [Video source/invocation](create-demo.sh)
- The dated official product comparison is retained privately at
  `kernelCAD-private/docs/competitors/2026-11-11-transit-mixer-wheel-material.md`.

## Reproduce

From the repository root:

```sh
npx tsx scripts/renderCatalogPreviews.ts transit-mixer-truck
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/construction-equipment/ tests/integration/catalog/transitMixerWheelMaterial.test.ts
npx vitest run tests/integration/catalog/transitMixerWheelMaterial.test.ts
npx vitest run tests/integration/catalog/
bash artifacts/catalog-demos/construction-transit-mixer-wheel-material-review-20261111/create-demo.sh
```

The GLB regression checks that all six exported rim nodes use the structural
steel color, no rim is assigned to equipment paint, existing color controls and
presets remain available, and geometry statistics do not change. Verification
logs and generated index rows are retained in [`verification/`](verification/).

## Live state and limits

Before the local correction, the public detail page, `.kcad.ts` source and PNG
matched the checked-in baseline. This branch has not been deployed, so the live
preview continues to show the earlier yellow rims. No roadworthiness,
manufacturer-specific fit, safety, equipment simulation or physical acceptance
is established.
