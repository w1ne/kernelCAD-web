# EV charging: fleet depot DC dispenser screen bezel material review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/fleet-depot-dc-dispenser.png) · [after preview](after/fleet-depot-dc-dispenser.png) · [five-preview audit ledger](preview-review.md)

## Result

`ev-charging-infrastructure/fleet-depot-dc-dispenser` now frames its status screen in a black
polymer bezel. Before, the 294 x 303 mm `display-bezel` used the `displayGlass` control of the
250 x 223 mm screen, so frame and glass rendered as one pale panel. A new `bezelPolymer` control
(label "Screen bezel (black polymer)", default `#1f2427`) colours the bezel. Both presets
(`fleetReady`, `nightService`) set it. Geometry is unchanged: 364 triangles, same bounds.

## Evidence

- `tests/integration/catalog/fleetDepotDcDispenserBezelMaterial.test.ts` fails on the original
  source (no `bezelPolymer` control) and passes after the fix. It checks the exported GLB:
  bezel colour, glass colour, powder-coat parts, bezel proud of the door, glass 5.5 mm proud of
  the bezel, frame 44.8 mm wider and 80.1 mm taller than the glass.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts fleet-depot-dc-dispenser`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.

## Limits

Local source and software-rendered preview only. Not deployed. Noted, not fixed: connector
cradles are bare stubs, cables are straight rods that end in mid-air, and the model has no
overhead cable guides although the description names them. 16 EV assets still colour
`display-bezel` with `displayGlass`.
