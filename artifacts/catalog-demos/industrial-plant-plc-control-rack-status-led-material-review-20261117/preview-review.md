# Five-preview semantic review — 17 November 2026

The sample is from `industrial-plant`. The first two assets have no earlier
preview-review entry. The other three were rechecked from their rendered PNGs;
none is touched by an open issue or pull request. Public live previews and
detail routes were fetched before editing; every public PNG SHA-256 matched its
local baseline preview. The public PLC page still serves the baseline after the
local change because this branch is not deployed.

| Asset | What the rendered preview shows | Finding |
|---|---|---|
| `pallet-rack-bay` | Two braced uprights, footplates, three beam levels and shelf decks; the orange beams and braces separate from the gray rack steel. | Reads as a pallet-rack bay; no material mismatch found. |
| `plc-control-rack` | Seven upright I/O cards on a backplane; all 21 small indicator blocks and one card housing share the orange safety-paint color. | Material mismatch: indicator lenses are safety paint, and one otherwise matching card housing is also orange. The repeated orange points read as paint marks rather than channel/RUN/ERROR indicators. Corrected to steel housings, green channel/RUN lenses and red ERROR lenses. |
| `electric-pallet-jack` | Rear drive/tiller housing, two long forks and load wheels form a compact walk-behind pallet jack. | Recognizable as the named object; the gray forks, dark wheels and orange housing are plausible. No material mismatch found. |
| `vertical-storage-tank` | Tall cylindrical vessel, feet, circumferential bands and an external level gauge. | Reads as a vertical tank; gray vessel and highlighted bands/gauge remain distinguishable. No material mismatch established. |
| `diesel-generator-set` | Enclosed skid-mounted unit with a ventilation grille, control panel and exhaust stack. | Reads as an enclosed generator set; enclosure, steel base and controls have plausible finishes. No material mismatch found. |

The correction is limited to `plc-control-rack`. It changes no dimensions or
geometry and does not model controller operation. The source and color mapping
are described as native kernelCAD catalog behavior, not as a vendor-specific
product replica.
