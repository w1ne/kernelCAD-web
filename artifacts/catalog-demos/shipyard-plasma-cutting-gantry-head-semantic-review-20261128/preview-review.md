# Five-preview semantic review — 2026-11-28

Base: `origin/develop` at `929ce50d7` (after railway turnout PR #1837).
Target search: no open PRs; no matching open issues for these asset names or the plasma/gantry-head terms.

| Preview | Visual review |
| --- | --- |
| `industrial-plant/diesel-generator-set` | Packaged enclosure on a skid with a louvered service panel, small control panel and exhaust stack; reads as an enclosed generator set. |
| `mining/jaw-crusher-module` | Main crusher housing, drive motor, exposed flywheel, support frame and discharge conveyor read as a jaw-crusher module. |
| `shipyard/plasma-cutting-gantry-head` | Shows the slatted cutting table, floor rails, full bridge with end carriages, torch station and console. The asset ID says “head”; the rendered object is a complete CNC cutting machine. |
| `recycling-facility/glass-washer-trommel` | Horizontal screened drum on a support frame with drive and discharge; reads as a glass-washing trommel. |
| `construction-equipment/concrete-batch-plant` | Feed bins, mixer assembly, frame and tall cement silo read as a compact batch plant. |

The four non-target previews had plausible silhouettes and material palettes at catalog-preview scale. The selected defect is semantic scope: a “gantry head” asset contains the full machine and its site equipment. The existing source confirms this includes a 5.4 m slat table, 6 m floor rails, extraction fan, operator console and gantry. The fix keeps the stable asset ID and models the torch carriage, Z lifter and a short local bridge segment as a head assembly.

The live catalog hub was checked on 2026-11-28: it describes the library as 2,402 free CC0 models in 50 kits and presents Shipyard as a visualization kit. The exact per-asset route was not available from the web cache during this review. No palette/color mismatch was established among the five previews; this repair addresses the confirmed false scope label.
