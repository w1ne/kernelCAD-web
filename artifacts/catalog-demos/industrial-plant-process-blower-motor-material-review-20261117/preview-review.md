# Five-preview ledger — 17 November 2026

| Rendered asset | Preview read | Material review |
| --- | --- | --- |
| `industrial-plant/palletizer-robot-cell` | Reads as a fenced palletizing cell with a pedestal-mounted arm. The joints and arm are intentionally low-poly. | The initial screen accepted the yellow floor slab as safety paint. A follow-up review found that the full floor plane should be concrete; see the [palletizer floor-material handoff](../palletizer-robot-cell-floor-material-review-20261117/README.md). Posts and pedestal retain safety paint. |
| `industrial-plant/pressure-relief-valve` | Reads as an upright spring-loaded valve with flanged inlet, side outlet, cap and lift lever. | Painted valve surfaces and contrasting gray neck/lever are plausible for a generic scene asset. No mismatch established. |
| `industrial-plant/process-blower` | Reads as a blower package with a volute housing, side intake, drive motor, raised outlet and base. | The drive motor was assigned the `safetyPaint` control. This was the selected mismatch; it now has its own `motorEnamel` control. |
| `industrial-plant/bucket-elevator` | Reads as a bucket elevator; the front inspection opening exposes the bucket loop between head and boot housings. | Gray casing, dark belt and orange buckets/housings separate visible materials plausibly. No mismatch established. |
| `industrial-plant/chemical-metering-skid` | Reads as a dual-pump metering skid with a common header and control box. | The description mentions gauges, but none are visible; `gaugeGlass` colors the control display. This is a geometry/label follow-up, not part of this material-only change. |

The images under `samples/` are the exact rendered previews inspected. The only
selected material defect is the process blower motor finish. No asset ID,
geometry, dimensions, triangle count, or triangle budget changed.
