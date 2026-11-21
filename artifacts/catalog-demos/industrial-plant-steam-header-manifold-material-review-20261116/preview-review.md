# Industrial-plant semantic preview audit — 2026-11-16

Scope: five rendered industrial/manufacturing assets selected after checking PR
#1258 and searching open issue and pull-request titles/bodies for each exact
asset ID. PR #1258 is merged; every recorded CI check passed. The five selected
public sources and preview PNGs matched the retained local pre-edit snapshots;
see [published hashes](preview-review/hashes.json). The current live detail page
and preview both returned HTTP 200.

| Asset | Rendered observation | Decision |
| --- | --- | --- |
| `distillation-column` | Tall insulated process tower, separate process pipework, yellow platforms and ladder are recognizable in the 3/4 preview. | Left unchanged. |
| `screw-conveyor` | Enclosed inclined tube, drive end, hopper, discharge end and two support saddles read as a screw conveyor. | Left unchanged; the internal screw is enclosed and is not visible in this preview. |
| `vibratory-feeder` | Wide steel feed pan, distinct drive unit, spring supports and painted lower frame read as a feeder. | Left unchanged. |
| `diesel-generator-set` | Enclosed genset has a large louvered side, control panel, exhaust stack and separate base. | Left unchanged. |
| `steam-header-manifold` | Gray header and valve bodies contrasted with five yellow branch risers; pipe bodies were assigned the safety-paint control. | **Fixed:** branch risers now use the existing steel control. Yellow handwheels and support skid remain safety-painted. The preview also shows the skid separated below the header; that geometry follow-up is recorded but unchanged in this material-only pass. |

The branch-pipe correction is limited to material assignment. No geometry,
asset ID, kit membership, param names, presets, or triangle budget changed. The
preview remains 980 triangles under the existing 1,400-triangle budget.

The date-stamped external product and CAD workflow comparisons are retained in
the private `kernelCAD-private` repository. Public artifacts describe the
native kernelCAD asset, its own controls, source rendering, and local checks.
