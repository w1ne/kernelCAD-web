# Five-preview review — 18 November 2026

Checked the checked-in rendered previews and source records for all five
selected beverage-line items. Open issue and PR scans found no selected-ID or
source-path overlap.

| Asset | Envelope (X × Y × Z, m) | Triangles / budget | Preview finding |
| --- | ---: | ---: | --- |
| `cap-feed-hopper` | 0.60 × 0.66 × 0.48 | 152 / 2,200 | Covered cap bin, metering throat and support frame read as a cap-feed hopper. Stainless body and coated stand are coherent. |
| `slip-sheet-dispenser` | 0.76 × 0.96 × 0.90 | 304 / 2,200 | Sheet magazine, pick head, frame and outfeed shelf read as a pallet slip-sheet dispenser. Board stack and metal mechanism are coherent. |
| `stretch-wrapper` | 2.59 × 2.77 × 1.76 | 1,004 / 1,200 | Turntable, loading ramp, mast, carriage and partly wrapped pallet load read as a stretch wrapper. Film, steel, timber and cases remain separate. |
| `wraparound-labeler` | 1.185 × 0.985 × 0.705 | 216 / 2,200 | Label roll, vacuum drum, bottle deck and control box read as a label station. Visible material assignments are coherent. |
| `carton-bottom-sealer` | 1.30 × 0.995 × 0.75 | 176 / 2,200 | The bed, guide lanes and upper taping head read as a case sealer. The baseline incorrectly colored the steel taping-head mechanism as food-grade polymer. |

## Correction

The broad `/tape/` matcher grouped `tape-head` with `tape-roll`. The head now
uses `stainlessSteel`; the pressure-sensitive polymer tape roll remains on
`foodPolymer`. No geometry, dimensions, IDs or presets changed. The preview
clearly distinguishes the gray steel head from the teal polymer roll.

This is a generic native kernelCAD scene prop. The dated official manufacturer
comparison is retained privately in `kernelCAD-private`; no vendor-specific
identity, machinery performance or manufacturing specification is claimed.
