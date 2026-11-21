# Five-preview semantic review — 17 November 2026

All images below are rendered catalog previews from the current branch. The
sample excludes sources changed by open PR #1507 and IDs named by open issues.
The saved issue list and open-PR source paths are in `verification/`.

| Asset | What the preview shows | Review |
| --- | --- | --- |
| `industrial-plant/belt-conveyor` | A raised belt, transverse rollers, paired support stations, and an end drive. | Reads as a belt conveyor. Belt, roller, and frame finishes match their named controls; no material mismatch selected. |
| `industrial-plant/cartridge-filter-housing` | A vertical vessel with top access cap, side nozzle, supports, and ladder. | Reads as a cartridge-filter vessel. The ladder appears slightly separated from the shell; mounting detail is a geometry follow-up, not changed here. |
| `industrial-plant/gantry-crane` | A mobile portal frame with crossbeam, trolley, chain, and hook block. | Reads as a small gantry crane. Frame, safety-painted trolley, and rubber casters are visually distinct; no material mismatch selected. |
| `industrial-plant/process-water-silo` | A vertical process-water vessel with a top nozzle, side nozzle, lower outlet transition, access ladder, and support feet. | Recognizable as a tank. The two visible process nozzles and lower outlet transition used `safetyPaint` while the adjacent shell and flange used `steel`. Selected material mismatch: assign those three process parts to `steel`; keep safety paint on the roof lip, ring band, ladder, and supports. |
| `industrial-plant/shell-and-tube-exchanger` | A horizontal pressure shell with channel heads, nozzles, tube sheets, and saddles. | Reads as a shell-and-tube exchanger. No material mismatch selected. |

This review changes only the three visible process-part color assignments. It does not
change geometry, dimensions, presets, triangle budget, or asset count.
