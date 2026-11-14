# Industrial/manufacturing preview audit ledger — 2026-11-11

**Feature PR checked:** [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was open with CI green and no review decision recorded before this audit.

**Selection check:** The five exact source paths below are unchanged in #1258's local compare-to-`develop` diff and absent from open PR #1215's file list. Other open catalog PRs #1279, #1308 and #1323 target `standard-components`; #1211 targets `sports`; #1325 has no catalog paths. Open issue searches for all five asset IDs returned no matches. The earlier industrial-plant reviews and the already noted fixes on #1298, #1305, #1307 and #1308 were not duplicated.

| Rendered asset | Preview observation | Decision |
| --- | --- | --- |
| `industrial-plant/cable-tray-bridge` | Two side rails, repeated tray rungs and two support frames make a raised cable tray bridge recognizable. The ochre rail and foot finish reads as a deliberate safety-paint treatment. | Leave unchanged. |
| `industrial-plant/compressed-air-receiver` | Horizontal cylindrical vessel, two end heads, three top necks, gauge, saddle supports and skid are visible. The heads and necks were safety-paint gold while the pressure shell was steel gray. | **Fixed:** put both welded heads and all three nozzle necks on the existing steel control; preserve safety paint on supports and skid. |
| `industrial-plant/electric-chain-hoist` | Trolley plate, hoist case, hanging chain, hook block and suspension eye communicate a compact electric chain hoist. | Leave unchanged. |
| `industrial-plant/vibratory-feeder` | Sloped pan, rear hopper transition, four spring supports and drive/motor assembly communicate a vibratory feeder. | Leave unchanged. |
| `industrial-plant/weigh-hopper` | Upper bin, tapered discharge transition, four load-cell supports and outlet gate communicate a batch weigh hopper. | Leave unchanged. |

The five before previews and source snapshots are retained in this bundle. The corrected receiver preview and source snapshot are retained under `previews/after/` and `source/after/`. The source correction changes only material assignments; geometry, dimensions, controls, presets, triangle budget and asset count stay the same.

Official product and CAD appearance-workflow comparisons were checked on 2026-11-11 and recorded privately in `kernelCAD-private/docs/competitors/2026-11-11-industrial-compressed-air-receiver-material-review.md`. This review concerns the appearance of a native kernelCAD scene asset; it does not claim vendor fidelity, pressure performance, manufacturing suitability, deployment or physical acceptance.
