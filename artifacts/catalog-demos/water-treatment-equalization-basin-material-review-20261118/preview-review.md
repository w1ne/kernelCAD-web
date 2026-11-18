# Five-preview semantic audit — 18 November 2026

PR #1258 was checked first: merged, all 17 reported CI checks successful, and
no submitted review. Current open PR file lists and exact open-issue searches
were checked for these five asset IDs; none are already targeted.

| Asset | What the rendered preview shows | Review |
| --- | --- | --- |
| `water-treatment/activated-carbon-filter-vessel` | Tall faceted vessel with a top access neck and two side ports. | Recognizable filter vessel; shell, fittings and supports have distinct finishes. No selected mismatch. |
| `water-treatment/equalization-basin` | Open rectangular basin with a central mixer column and paddle arm. | Selected: source assigns stainless steel to the basin floor and concrete to the mixer assembly, while the declared finish controls and concrete shell identify those roles in reverse. |
| `water-treatment/sodium-hypochlorite-cabinet` | Raised dosing cabinet with paired doors, vents, pipe stubs and a base tray. | Recognizable cabinet; enclosure and fittings are visibly distinct. No selected mismatch. |
| `water-treatment/bar-screen-channel` | Concrete channel with an inclined rake screen, drive cover, discharge bin and guardrails. | Recognizable bar-screen channel with the defining rake and discharge path. No selected mismatch. |
| `water-treatment/membrane-filtration-rack` | Four tall pressure modules between end rails. | Readable as a filtration rack; not selected for this material audit. |

The selected correction is one material-role mapping in one asset: basin
structure (floor and perimeter walls) uses `concrete`; mixer pedestal, arm and
hub use `stainlessSteel`. The test checks every affected exported GLB node.
The public preview images and source snapshots are retained in `previews/` and
`sources/`.

This bundle records a local software render and geometry/material regression.
The change has not been deployed; no deployed behavior, process simulation,
treatment performance or hardware acceptance is claimed.
