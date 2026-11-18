# Industrial/manufacturing preview review ledger

**Date:** 2026-11-11
**Feature PR checked:** [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258), open; current CI and DCO were green at review time; no review recorded.
**Selection check:** Compared exact source paths with the open PR list, the file list for #1215, and the local diff for #1258. None of these five IDs was already targeted by open work. Other open manufacturing/catalog PRs target standard-components or different IDs.

The five selected previews were rendered in the checked-in catalog and inspected before editing. Source snapshots and preview baselines are retained in this bundle.

| Asset | Before-render observation | Disposition |
| --- | --- | --- |
| [`industrial-plant/distillation-column`](previews/before/distillation-column.png) | Tall process shell with separated access platforms and a full-height ladder. | Reads as a distillation column at preview scale; unchanged. |
| [`industrial-plant/inline-flow-meter`](previews/before/inline-flow-meter.png) | Flanged pipe spool, instrument housing and display are visible. | Reads as an inline flow meter; unchanged. |
| [`industrial-plant/pressure-relief-valve`](previews/before/pressure-relief-valve.png) | Inlet flange, central valve body, spring cap and lift lever are visible. | Reads as a pressure-relief valve; unchanged. |
| [`industrial-plant/variable-frequency-drive-cabinet`](previews/before/variable-frequency-drive-cabinet.png) | Tall electrical enclosure with operator door, display and handle. | Reads as a VFD cabinet; unchanged. |
| [`industrial-plant/positive-displacement-pump`](previews/before/positive-displacement-pump.png) | The motor and a plain block dominated the image; the pump head and claimed fluid connections were not recognizable. | Corrected: the [new preview](previews/after/positive-displacement-pump.png) separates the drive motor, guarded coupling, bolted pump cover, two raised flanged ports and relief-return feature. |

## Correction

The prior positive-displacement-pump source claimed a ribbed gearbox, inlet flange and pressure bypass but contained a simple block for the pump body and no named fluid ports or relief feature. The source now models a compact external-gear-pump scene prop with a round bolted service cover, separate suction and discharge nozzles/flanges, a relief valve and return line. A third material control separates motor enamel from pump steel and the safety finish. The existing asset ID and named presets remain; the triangle budget is **1,800**, with a default render of **1,508 triangles**.

The before public source and PNG both returned HTTP 200 and matched the local pre-edit files byte-for-byte on 2026-11-11. See `verification/public-before-hashes.txt`.

## Candidates excluded after checking open work

- `industrial-plant/industrial-boiler` and `industrial-plant/plate-heat-exchanger` overlap open PR #1215; their preview/source snapshots are retained under `preview-review/screened-open-work/` and `preview-review/screened-not-selected/`. The plate-exchanger source and preview show two port bodies while the kit README says four. This separate discrepancy is recorded for the owning PR and was not changed here.
- `industrial-plant/industrial-transformer` and `industrial-plant/shell-and-tube-exchanger` were already changed in the current PR #1258. Their source and preview snapshots are retained under `preview-review/screened-open-work/`; neither was reworked.

## Other candidate screens

The three additional candidate renders below were viewed while assembling the final five. The blower preview has a motor attached to a broad housing with a side inlet and top outlet; the reactor preview has a vertical vessel, top nozzle, side platform and ladder. Neither provided a clearer material mismatch than the selected pump. The silo's ladder appears offset from the shell with no stand-offs visible in the preview; that is a possible separate review, not part of this one-fix correction. Sources and previews are retained under `preview-review/candidate-screens/`.

`industrial-plant/process-blower`, `industrial-plant/process-reactor-vessel`, and `industrial-plant/process-water-silo` are not listed among the final five.

## References

Dated official pump product/workflow comparisons were checked on 2026-11-11 and recorded privately in `kernelCAD-private/docs/competitors/2026-11-11-industrial-positive-displacement-pump-semantic-review.md`. Public documentation here describes kernelCAD-native scene geometry only. This is a low-poly visual asset; it does not establish pump operation, pressure capacity, vendor accuracy, or manufacturing suitability.
