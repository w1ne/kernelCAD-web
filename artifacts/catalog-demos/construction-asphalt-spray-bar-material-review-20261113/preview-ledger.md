# Five-preview ledger — construction-equipment, 2026-11-13

Baseline: PR #1258 head `21ba047b6`, all reported checks passing (`verification/pr-checks-before.txt`).
Selection: five construction-equipment IDs that appear in no earlier review ledger or bundle, and in no
open PR. Open PRs #1298, #1305, #1307 and #1308 touch other kits.

| Asset | Reads as named object? | Material finding | Other observations (recorded, not fixed) |
|---|---|---|---|
| cold-planer-milling-machine | Partly: crawler machine with canopy | `cutting-tooth` parts use enamel while the drum is steel; teeth are hidden under the hood in the preview | No loading conveyor, the main identifying feature of a cold planer |
| concrete-pump-truck | Yes: truck, hopper, folding boom, outriggers | Rear outrigger foot pads use enamel, front pad uses steel (inconsistent but plausible) | Boom has only two sections |
| portable-air-compressor | Yes: towable enclosure on a single axle | None | Tyres (y = ±256 mm inner face) intersect the 530 mm-wide enclosure |
| rough-terrain-forklift | Yes: cab, mast, forks, large tyres | None | Default height reported as 0.575 m in `sizeM` |
| asphalt-distributor-truck | Yes: cab, tank, rear spray bar | **Defect: `spray-bar` and `spray-nozzle-0..8` use `equipmentPaintColor`** | Spray bar floats ~90 mm behind the chassis with no mounting arms |

Kit-wide dimensional observation (recorded, not fixed): the sampled vehicles are 1.0–1.8 m long
(for example `rigid-haul-truck` 1.587 m, `asphalt-distributor-truck` 1.543 m). Real machines of
these types are about 6–12 m long. The default scale is therefore roughly 1:5 to 1:8.

## Fix

An asphalt distributor's rear spray bar is a heated bare-steel pipe manifold with steel nozzles.
The asset already defines `structuralSteelColor` ("Exposed structural steel"). The bar and the nine
nozzles now use it. The tank, saddles and cab keep `equipmentPaintColor`. Geometry, triangle count
(1,196), parameters and presets are unchanged.
