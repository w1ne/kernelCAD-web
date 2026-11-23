# Five-preview semantic audit — 2026-11-11

PR #1258 was green at pre-audit head `fcadcba8e`; its review decision and latest
reviews were empty. All open PR file lists and open issues were checked. None
targets the five IDs below. PR #1215 touches `industrial-boiler` and
`plate-heat-exchanger`; both were excluded. Existing repairs #1298, #1305,
#1307 and #1308 affect other assets and were not duplicated.

The live source and PNG for `evaporative-cooling-tower` returned HTTP 200 and
matched their local pre-edit SHA-256 hashes. The [contact sheet](preview-review/contact-sheet-before.png)
and individual before previews/sources are retained in this bundle.

| Rendered asset | Preview observation | Decision |
| --- | --- | --- |
| `industrial-plant/evaporative-cooling-tower` | The necked shell, basin, throat and top deck read as a tower, but the two raised hubs had no visible rotor blades. The source described a rooftop fan assembly. | **Fixed:** add two open shrouds with four broad, distinct axial blades per fan and a material control for the blades. |
| `industrial-plant/forklift-truck` | Counterweight, LPG bottle, distinct front/rear tyres, mast, overhead guard, operator seat, carriage and two projecting forks read as a counterbalance forklift. | Leave unchanged. |
| `industrial-plant/flare-stack` | The elevated stack, tip collar/cap, bracing, access ladder and service platform read as a flare stack. | Leave unchanged. |
| `industrial-plant/distillation-column` | Tall segmented vessel, base, nozzles, access ladder, three circular platforms and top piping read as a process column. | Leave unchanged. |
| `industrial-plant/industrial-transformer` | Tank, four top bushings, side radiator bank and base plinth read as an oil-filled distribution transformer. | Leave unchanged. |

This audit checks recognizable scene-asset identity and visible components. It
does not establish vendor fidelity, dimensions, process performance,
electrical ratings, manufacturing suitability, physical acceptance or
deployment. Dated official product and workflow comparisons are retained in
`kernelCAD-private/docs/competitors/2026-11-11-industrial-cooling-tower-semantic-review.md`.
