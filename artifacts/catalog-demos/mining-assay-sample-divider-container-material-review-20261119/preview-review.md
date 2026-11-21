# Five-preview semantic audit — 19 November 2026

All five checked-in 512 × 512 previews were opened. The review covered the
recognizable object, visible process features, component finishes and catalog
mesh envelope. `sizeM` is the generated catalog bound in metres, not a vendor
specification.

| Asset | Triangles / budget | `sizeM` (m) | Preview and material observation | Result |
|---|---:|---:|---|---|
| `mining/assay-sample-divider` | 2,032 / 4,200 | 0.690 × 0.820 × 0.504868 | Blue drive base, sloped control face, stainless hopper and carousel, feeder and eight ore-filled open buckets read as a rotary divider. The baseline buckets were pale ivory and mapped to `jarPlastic` while the adjoining sample-contact surfaces used `stainlessSteel`. The buckets now use the existing stainless palette; the ore remains separate. | **Selected material mismatch.** Before/after images are retained in [`before/`](before/) and [`after/`](after/). |
| `mining/core-tray-rack` | 6,432 / 7,000 | 2.340 × 1.620 × 1.650 | Four-tier braced rack, orange load beams, ribbed trays, core runs and end tags read as exploration-core storage. Steel, tray and rock finishes are distinct and plausible. | No mismatch established. |
| `mining/mine-refuge-chamber` | 3,468 / 4,400 | 5.637268 × 3.200 × 2.683988 | Sealed orange refuge shell, access bands, external life-support cylinder cage and roof fittings read as a mine refuge chamber. The visible steel shell, reflectors and cylinders have coherent roles. | No mismatch established. |
| `mining/mine-survey-tripod` | 1,464 / 1,900 | 2.955438 × 1.920 × 1.602 | Three-legged instrument stand, total station, red-white prism pole, bipod and hard case are distinguishable. Yellow legs and separate metal joints/feet are a plausible equipment finish. | No mismatch established. |
| `mining/mine-ventilation-fan` | 3,236 / 6,600 | 16.200 × 10.400 × 13.600 | Axial casing and inlet duct, motor and support, elevated discharge, shaft collar and electrical house read as a surface mine-fan station. Coated duct, support steel, concrete and cladding are visually separated. | No mismatch established. |

The [baseline capture](live-baseline/public-check.json) records that the five
public pages, sources and previews returned HTTP 200 and matched the local
pre-change source, preview and index. The open-target audit is in
[`verification/open-target-check.json`](verification/open-target-check.json).

The target source snapshot and before/after previews, focused regression,
verification commands and inspected MP4 are retained in this bundle. No
simulation, deployment or hardware acceptance is claimed.
