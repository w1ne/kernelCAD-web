# Shipyard manufacturing preview ledger — 2026-11-13

Five rendered assets were reviewed from `catalog/kits/shipyard/previews/`.
The source paths were checked against the open PR file lists; none of these five
asset sources is changed by an open PR.

| Asset | Visual review | Result |
|---|---|---|
| `abrasive-blast-pot` | Upright pressure pot, top hopper, side manifold and two wheels are identifiable. The rigid lower `hose-outlet` block used the elastomer finish assigned to the tires. | **Selected material mismatch.** Remapped the rigid outlet block to the existing structural-steel control. The preview also shows no visible axle or support joining the wheel discs to the vessel; that separate geometry issue is not changed in this material-only round. |
| `plate-rolling-machine` | Three rollers, blue side frames and drive motor read as a plate roller. The light roller surfaces read as metal. | No material mismatch selected. |
| `plasma-cutting-gantry-head` | Dark cutting bed, orange gantry rails and torch carriage read as a CNC plasma machine. | No material mismatch selected. |
| `pipe-spool-rotator` | Steel pipe is supported by paired orange rollers on green drive/idler stands; the pendant and pedal are visible. | No material mismatch selected. |
| `hull-block-paint-booth` | Two tall booth panels and overhead structure read as a paint enclosure. | No material mismatch selected. |

The material comparison and its official source links are recorded privately in
`kernelCAD-private/catalog-shipyard-abrasive-blast-pot-material-review-20261113/COMPARISON.md`.
