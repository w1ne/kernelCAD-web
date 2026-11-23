# Industrial-plant semantic preview audit — 2026-11-16

Scope: five rendered industrial/manufacturing assets not targeted by the open issue or pull-request queues at selection time. PR #1258 was checked first: it is merged, its recorded CI checks passed, and its title/diff do not target these five assets. Existing asset-specific fixes on other branches were not selected. For all five candidates, the current public `.kcad.ts` and PNG bytes matched the local pre-edit source and preview snapshots; hashes are in `preview-review/hashes.json`.

| Asset | Rendered observation | Decision |
| --- | --- | --- |
| `forklift-truck` | Counterbalance forklift reads clearly from the body, overhead guard, LPG bottle, mast, forks, wheels, and separated dark frame/tire colors. | Left unchanged. |
| `belt-conveyor` | Rubber belt, transverse carrying rollers, return rollers, drive end, frame, and support stations read as a belt conveyor. | Left unchanged. |
| `air-compressor` | Horizontal receiver, pump/motor package, skid, and pressure controls make a recognizable shop compressor. | Left unchanged. |
| `centrifugal-pump` | Volute, motor, raised suction/discharge flanges, baseplate, and separate metal colors read as an industrial pump set. | Left unchanged. |
| `roller-conveyor-line` | The label described repeated rollers, but the preview showed a solid steel bed and a single yellow cylinder running lengthwise. The cylinder was safety-painted and could not read as a roller bed. | **Fixed:** remove the solid deck; add eleven crosswise rollers on the existing side-rail/support structure; use a separate steel color control. |

No second material mismatch was selected. The asset ID, kit membership, and catalog count stay unchanged. The changed default model is 652 triangles under its 1,400-triangle budget. The selected geometry is a low-poly scene asset, not an engineering specification.
