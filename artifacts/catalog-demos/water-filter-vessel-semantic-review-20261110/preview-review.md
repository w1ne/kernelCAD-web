# Five-preview audit ledger — 2026-11-10

The audit inspected current rendered previews and their `.kcad.ts` source descriptions. The selected asset IDs were checked against open catalog-fix issue/PR file lists. Active fixes for #1297, #1298, #1305, #1307 and #1308, the seven assets in #1279, and the industrial-plant files in #1215 were excluded. The open feature PR #1258 is the audit context.

| Rendered asset | Finding | Action |
| --- | --- | --- |
| `industrial-plant/centrifugal-chiller` | Paired vessels, compressor/motor package, pipework and controls read as a water-cooled chiller. | Leave unchanged |
| `industrial-plant/forklift-truck` | LPG bottle, counterweight, steer/drive wheels, mast, fork carriage, tines and overhead guard communicate a counterbalance forklift. | Leave unchanged |
| `industrial-plant/shell-and-tube-exchanger` | The default ochre `safetyPaint` colored tube sheets, process nozzles, saddles and shell band. Those exposed metal parts read as brass/yellow-coated components, with no safety-painted assembly described. | Changed to a separate neutral `hardware` metal control; added weathered/stainless presets and an exported-GLB material regression. See the [material handoff](../shell-tube-exchanger-material-review-20261110/README.md). |
| `industrial-plant/industrial-transformer` | Tank, radiator banks, primary/secondary bushings and terminals read as an oil-filled distribution transformer. | Leave unchanged |
| `water-treatment/pressure-sand-filter-vessel` | Geometry/description mismatch: the preview showed one small vertical steel stub; source built both inlet/outlet as vertical-axis cylinders separated from the shell wall. | Rebuilt the pair as lower/upper horizontal annular nozzles with stainless flange lips that overlap the shell. Added an exported-GLB regression. See the [vessel handoff](../README.md). |

The exchanger preview and source were part of the local branch review. The pressure-filter asset's current public preview and `.kcad.ts` were checked at `kernelcad.com/assets/` on 2026-11-10; the public source SHA-256 matched the local source before editing. The original public preview/source and updated local preview/source are retained in the vessel bundle's `before/` and `after/` directories.
