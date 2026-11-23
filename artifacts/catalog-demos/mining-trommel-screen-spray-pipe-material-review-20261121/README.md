# Mining: trommel screen spray pipework material review (2026-11-21)

**Demo:** [20-second local review MP4](review-demo.mp4) · [before preview](before/trommel-screen.png) · [after preview](after/trommel-screen.png) · [inspection views](inspect/) · [eight-preview audit ledger](preview-review.md)

## Result

`mining/trommel-screen` now has one galvanized spray-water pipe run that is fed from the ground.
Before, the `spray-bar` and six `spray-nozzle-*` used the `stainlessSteel` control, whose label is
"Screen panels". A customer who changed the screen panel colour also changed the water pipe. The
`spray-supply` used the pale-blue `water` colour (`#9fc6d8`), so the pipe was drawn in the colour of
water and the one pipe run had two finishes. The supply ran diagonally down from the bar and ended
in the air, 600 mm above the ground.

After: the `spray-bar`, the six `spray-nozzle-*`, the `spray-supply`, the `spray-elbow`, the
`spray-riser` and the `spray-riser-flange` are galvanized steel (`#a7afb1`). The supply runs level
from the discharge end of the bar to the back of the drum. The elbow turns it down, and the riser
drops through a cast iron `spray-valve` (`#3c4144`, with `spray-valve-stem` and a red
`spray-valve-handwheel` `#c8322b`) to a flange on the discharge plinth. With the `mobile` mounting
the flange is at ground level. The `stainlessSteel` control ("Screen panels") now drives the screen
panels only. The control list and the three presets are unchanged. The unused `water` constant is
removed. Description and header comment are updated. Triangles: 2160 -> 2352 (budget 3200,
unchanged).

## Evidence

- `tests/integration/catalog/trommelSprayPipeMaterial.test.ts` fails on the original source
  (`spray-bar should use galvanized pipe`) and passes after the fix. It checks the exported GLB: the
  "Screen panels" label and the panels in that colour; bar, nozzles, supply, elbow, riser and flange
  galvanized; valve body cast iron and handwheel red; that the supply runs level at the bar height
  from the bar end to the back; that the elbow closes the supply end; that the riser hangs from the
  elbow and stands on its flange, and the flange sits on the discharge plinth; and that the valve is
  on the riser and surrounds it. Logs: `verification/test-before.txt`, `verification/test-after.txt`.
  The "before" run used a temporary copy of the test pointed at a copy of the kit with the original
  source, so the repository file was not swapped.
- `npx kernelcad render inspect` right and iso views, before and after: `inspect/`. The right view
  shows the pale-blue diagonal supply before and the level supply, riser and red handwheel after.
  The `mechanism.interpenetration` badge is present before and after; this change did not cause it.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts trommel-screen`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.
- `python3 scripts/checkCatalogQuality.py --kit mining`: 50/50 assets pass.
- `npx vitest run tests/integration/catalog/ --maxWorkers=2`: 210 files, 302 tests passed
  (`verification/catalog-integration.txt`).
- `npx eslint` on the kit and the new test: exit 0 (`verification/eslint.txt`).

## Limits

Local source and software-rendered preview only. Not deployed. The spray bar is above the drum with
drop nozzles through the screen; many trommels run the bar inside the drum. The riser ends at a
flange; there is no buried supply line or pump. The valve is a generic gate valve, not a specific
product. The screen panels are still one plain cylinder with no perforation. No hydraulic, structural
or safety check.
