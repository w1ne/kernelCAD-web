# Five-preview audit ledger (2026-11-10)

Selection excluded `recycling-facility/optical-sorter-arch` and `recycling-facility/primary-shredder` because current PR #1258 already changes them. The five assets below were checked against current open PR change lists; none overlapped #1298, #1305, #1307, #1308, #1297, #1279, or #1215.

| Rendered asset | Finding | Action |
| --- | --- | --- |
| `mining/jaw-crusher-module` | Crusher chamber, frame, drive mass, and feed/discharge conveyor read as a jaw crusher module. | Leave unchanged |
| `water-treatment/belt-filter-press` | Framed belt/roller stages and tanks read as a belt filter press. | Leave unchanged |
| `beverage-bottling-line/bottle-case-packer` | Bottles, carton/lift area and gantry communicate case packing. | Leave unchanged |
| `beverage-bottling-line/bottle-rinser-carousel` | Rotary table, bottle positions and rinse heads communicate bottle rinsing. | Leave unchanged |
| `beverage-bottling-line/cap-elevator` | Material mismatch: the large opaque gray shroud dominated the preview and buried the differently colored belt web and six polymer cleats; the lift read as a cabinet. | Opened the conveyor, added hopper/frame/drive/discharge anatomy and eight visible flights; now 516 triangles. |

The first four checked assets were visually reviewed in the generated contact sheet. The cap elevator was inspected both before and after; the before and after images and updated source are retained in this bundle.
