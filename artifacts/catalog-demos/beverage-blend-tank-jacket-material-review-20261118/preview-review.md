# Five-preview review — 18 November 2026

Checked the local rendered PNGs and source geometry for five beverage-line
assets. The open-target scan found no selected-ID or source-path overlap with
open issues or PRs.

| Asset | Envelope (X × Y × Z, m) | Triangles / budget | Preview review |
| --- | ---: | ---: | --- |
| `bottle-unscrambler` | 1.255 × 0.85 × 0.94 | 328 / 2,200 | Circular rotary disc, outer lip, central column and side discharge lane read as a rotary bottle-handling unit. Feed hopper, bottle selectors and enclosure are not represented; no material-role mismatch selected. |
| `beverage-blend-tank` | 0.83 × 1.69 × 0.97 | 492 / 2,200 | Agitated stainless vessel reads clearly with top drive, manway, sight glass and lower outlet. **Material mismatch fixed:** the jacket band was powder-coated teal while the vessel shell and sanitary fittings were stainless. |
| `flash-pasteurizer` | 1.52 × 0.91 × 0.785 | 508 / 2,200 | Plate-pack block, balance tank, product pump, control cabinet and skid base make a compact process skid. Holding tube and detailed process valves are not represented; no material-role mismatch selected. |
| `filler-valve-head` | 0.31 × 0.603 × 0.31 | 256 / 2,200 | Vertical stainless valve body, bonnet, stem, product port and bottle-centering bell read as a single filler valve head. Finish assignments are coherent. |
| `bottle-accumulation-table` | 1.77 × 0.395 × 1.25 | 276 / 2,200 | Round tabletop, side transfer lanes, guide sections and four legs read as an accumulation table. This source model is low (0.395 m overall); the 0.85–0.95 m tabletop range in one checked manufacturer specification is recorded as a possible scale follow-up. No material-role mismatch selected. |

## Correction

The tank's broad name matcher treated every `jacket` part as powder-coated
equipment. The explicit `jacket-band` mapping now uses `stainlessSteel`, in line
with the sanitary vessel shell. Geometry, dimensions, controls, presets and
triangle count are unchanged. The before/after images show only the jacket
finish changing from teal to stainless gray.

The public page represents a generic kernelCAD scene asset. Manufacturer
references and dated comparisons are recorded privately; no vendor geometry,
textures or palette were copied. The other observations above are retained for
future semantic review and were not changed in this material correction.
