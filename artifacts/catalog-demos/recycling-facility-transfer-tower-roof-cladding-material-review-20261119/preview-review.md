# Five-preview semantic audit — 19 November 2026

The preview PNGs and exact source snapshots are retained in [`samples/`](samples/).
The public baseline copies and current page/source/preview hashes are in
[`live-baseline/`](live-baseline/). All five public pages, source files and
preview routes returned HTTP 200; each public source and preview matched the
local selection baseline and current index source hash.

Catalog envelopes below use the generated `sizeM` vector in its stored axis
order. These are generic scene assets, not vendor dimensions.

| Asset | Triangles | `sizeM` (m) | Preview observation and result |
|---|---:|---:|---|
| `recycling-facility/conveyor-transfer-tower` | 2,054 / 4,400 | 17.83 × 6.8 × 3.902507 | Enclosed tower, braced enclosed incline gallery, tail house, outgoing belt, vent and ladder read as a transfer tower. The corrugated wall cladding is gray, but both broad roof sheets were yellow like the painted access structure. **Selected mismatch:** the tower and tail-house roof sheets belong to the existing cladding control. |
| `recycling-facility/conveyor-transfer-chute` | 1,604 / 4,800 | 4.825505 × 2.87 × 4.4 | Inclined feed belt discharges through an inspection-door chute onto a crossing receiving belt. The painted tower, chute, rubber belts, door panels and feed are visually distinct; no mismatch selected. |
| `recycling-facility/color-sorter-camera` | 1,284 / 2,800 | 1.97 × 1.49 × 0.99 | Overhead sensor bar, framed sloping feed surface, ejector and colored flake pieces read as a sorting camera station. Sensor, frame and feed colors are coherent; no mismatch selected. |
| `recycling-facility/inclined-belt-conveyor` | 1,428 / 1,900 | 2.555 × 4.28368 × 10.194155 | Receiving hopper, knee, cleated incline, trestle, head drive and access ladder read as a pit-to-sort-line conveyor. Belt rubber, frame paint, steel rolls and yellow trim are separated; no mismatch selected. |
| `recycling-facility/magnet-cleanout-drum` | 3,768 / 4,400 | 4.53 × 2.27 × 2.365 | Vibrating feed pan, magnetic drum, hood, splitter, ferrous and product chutes and bins read as a drum separator. Drum, frame, hood and scrap are distinct; no mismatch selected. |

The target source, before/after images, regression, checks and inspected demo are
listed in the bundle [README](README.md). Dated official references and private
comparison notes are in `kernelCAD-private` at
`docs/competitors/2026-11-19-recycling-transfer-tower-roof-material-review.md`.
