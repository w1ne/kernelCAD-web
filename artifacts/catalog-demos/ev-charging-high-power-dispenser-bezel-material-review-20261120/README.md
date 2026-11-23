# EV charging: high-power charge dispenser screen bezel material review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/high-power-charge-dispenser.png) · [after preview](after/high-power-charge-dispenser.png) · [five-preview audit ledger](preview-review.md)

## Result

`ev-charging-infrastructure/high-power-charge-dispenser` now frames its broad status screen in a
black polymer bezel. Before, the 350 x 326 mm `display-bezel` used the `displayGlass` control of
the 296 x 240 mm screen, so frame and glass rendered as one pale panel. A new `bezelPolymer`
control (label "Screen bezel (black polymer)", default `#1f2427`) colours the bezel. Both presets
(`fleetReady`, `nightService`) set it. The bezel also stood 1 mm clear of the enclosure face; it
now sits on it (depth 23 mm). Triangle count is unchanged at 376.

## Evidence

- `tests/integration/catalog/highPowerChargeDispenserBezelMaterial.test.ts` fails on the original
  source (no `bezelPolymer` control) and passes after the fix. It checks the exported GLB:
  bezel colour, glass colour, powder-coat parts, bezel on the enclosure face, glass 5.5 mm proud
  of the bezel, frame 53.2 mm wider and 86.4 mm taller than the glass.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts high-power-charge-dispenser`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.

## Limits

Local source and software-rendered preview only. Not deployed. Noted, not fixed: connector
cradles are bare stubs and cables are straight rods that end in mid-air. 15 EV assets still
colour `display-bezel` with `displayGlass`.
