# Cleanroom fan-filter unit filter-media material review — 13 November 2026

This round reviewed five lab-infrastructure previews and fixed one material
mismatch in the existing `lab-infrastructure/cleanroom-fan-filter-unit` asset.
No catalog IDs or kits were added.

## Finding and correction

In the baseline, the whole room-side face was one solid 972 × 972 mm plate in
the `steel` (structural steel) colour. The model had no filter media. On a real
fan-filter unit, the room-side face is the HEPA filter media or a white
diffuser, framed by a narrow flange that sits on the ceiling grid.

The updated model:

- cuts the steel plate into a perimeter flange with an 800 × 800 mm opening;
- adds a `filter-media` part with a new `filterMedia` colour control
  (default `#eef0ea`), recessed 6 mm below the flange;
- sets `filterMedia` in both presets (`cleanroom`, `highVisibility`);
- updates the source comment and description.

The stainless diffuser bars, enamel housing, indicator and envelope
(0.972 × 0.32 × 0.972 m) do not change. The mesh grows from 120 to 152
triangles; the budget is 1,800.

See the [before preview](before/cleanroom-fan-filter-unit.png) and the
[updated preview](after/cleanroom-fan-filter-unit.png).

## Five-preview ledger

| Asset | Observation | Result |
| --- | --- | --- |
| `cleanroom-fan-filter-unit` | Room-side face is a solid structural-steel plate; no filter media. | Fixed in this round. |
| `laminar-flow-workbench` | HEPA diffuser faces use the `filter` colour; acrylic sides, stainless tray and stand are separate. | No defect found. |
| `laboratory-fume-hood` | Black epoxy worktop, stainless baffle, glass sash and exhaust collar are separate. | No defect found. |
| `ultra-low-temperature-freezer` | Condenser grille louvres use the `rubber` control (label: door gasket and caster rubber). Real louvres are metal. | Minor; recorded, not fixed. |
| `laboratory-gas-cylinder-cabinet` | Exhaust `collar-throat` uses the `cylinder` (gas cylinder paint) control, so it shows green. | Minor; recorded, not fixed. |

The [five-preview sample](sample/five-preview-sample.png) shows the baseline
renders. The fan-filter defect was selected because it covers the largest
visible surface of its asset. Neither lab-infrastructure asset is in the
open-PR list checked on 13 November 2026, and no open issue names the kit.

Known limitation: the asset is authored with the filter face up. To hang it in
a ceiling grid, rotate it 180 degrees about X. This round did not change the
orientation, so the catalog preview stays the same view.

## Verification

```sh
npx tsx scripts/renderCatalogPreviews.ts cleanroom-fan-filter-unit
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/lab-infrastructure/ tests/integration/catalog/cleanroomFanFilterMedia.test.ts
npx vitest run tests/integration/catalog/cleanroomFanFilterMedia.test.ts
python3 scripts/checkCatalogQuality.py --kit lab-infrastructure
```

Results on 13 November 2026: the focused test passes 1/1 and fails on the
baseline source (120 triangles instead of 152). ESLint is clean. The
lab-infrastructure quality gate passes 60/60. The full catalog integration
suite passes 51/51 files and 84/84 tests in 11 min 37 s
([summary](verification/catalog-integration.md)). The regenerated index changes
only the `cleanroom-fan-filter-unit` row, and its `sourceSha256` matches the
source file.

No MP4 was produced in this round. The change is a colour and part split on
one existing asset; the before/after previews are the visual evidence.

The focused test checks the triangle count, envelope, colour controls, preset
values, palette mapping, exported media colour, and that every flange vertex
stays outside the 800 mm opening.

This generic low-poly asset is not a vendor design, filter rating, airflow
specification or cleanroom certification.
