# EV charging: compact DC fast charger plug material review (2026-11-20)

**Demo:** [16-second local review MP4](review-demo.mp4) · [before preview](before/compact-dc-fast-charger.png) · [after preview](after/compact-dc-fast-charger.png) · [five-preview audit ledger](preview-review.md)

## Result

`ev-charging-infrastructure/compact-dc-fast-charger` now moulds both charging plugs in polymer.
Before, the two 84 x 74 x 180 mm `*-connector-handle` shells and their `*-contact-collar` rings
used the cabinet `powderCoat` control, so each plug rendered as a teal painted-steel block at the
cable end. A new `connectorPolymer` control (label "Plug handle and contact collar (moulded
polymer)", default `#2a3033`) colours the four parts. Both presets (`fleetReady`,
`nightService`) set it. Geometry is unchanged; triangle count stays at 492.

## Evidence

- `tests/integration/catalog/compactDcFastChargerPlugMaterial.test.ts` fails on the original
  source (no `connectorPolymer` control) and passes after the fix. It checks the exported GLB:
  plug handle and collar colour, cable elastomer colour, and powder-coat cabinet and cradle parts.
- Preview re-rendered with `npx tsx scripts/renderCatalogPreviews.ts compact-dc-fast-charger`.
- `catalog/index.json` regenerated with `npx tsx scripts/buildAssetCatalog.ts`.

## Limits

Local source and software-rendered preview only. Not deployed. Noted, not fixed: the charging
cables are straight horizontal rods and the plugs lie on their sides at the cable ends; the
`display-bezel` still uses `displayGlass` (14 EV assets still match that pattern).
