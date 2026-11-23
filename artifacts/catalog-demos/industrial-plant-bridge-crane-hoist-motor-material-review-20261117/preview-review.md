# Five-preview ledger — 17 November 2026

| Rendered asset | Preview read and semantic checks | Material review |
| --- | --- | --- |
| `industrial-plant/forklift-truck` | Reads as a counterbalance forklift with a rear counterweight, contrasting steer/drive wheels, mast, carriage, paired forks, guard and LPG bottle. Its about-real-size description matches the visible proportions. | Body paint, dark rubber, steel structure and light bottle/fittings are distinct and plausible. No material mismatch established. |
| `industrial-plant/centrifugal-pump` | Reads as an end-suction pump package: motor, coupling guard, volute, upward discharge, axial suction flange and baseplate are visible. | Casing, motor, base/guard and metal finishes separate the equipment roles. No material mismatch established. |
| `industrial-plant/distillation-column` | Reads as a tall process tower with dished ends, skirt, stacked part-circle platforms, caged ladder and overhead line. The proportions are consistent with a roughly 16 m tower model. | Insulation cladding, access structure, process piping and skirt use separate controls. No material mismatch established. |
| `industrial-plant/industrial-boiler` | Reads as a horizontal packaged firetube boiler with burner end, stack, crown valves, shell bands and side water column. Its vessel and stack dominate the silhouette as described. | Shell, burner/doors/skid, piping and gauge glass use separate controls. No material mismatch established. |
| `industrial-plant/bridge-crane` | Reads as a top-running double-girder bridge in a runway bay: columns and runway, end trucks, twin bridge girders, trolley, hoist, hanging ropes, hook and pendant are visible. | The hoist motor used the yellow `girder` control despite the distinct `hoist` control for hoisting machinery. This is the selected mismatch; the motor now uses the existing hoist finish. |

The only selected defect is a part-to-control assignment in the bridge crane. No
asset ID, dimensions, geometry, knobs, presets or triangle budget changed. The
models remain generic low-poly kernelCAD scene assets, not engineering
specifications.
