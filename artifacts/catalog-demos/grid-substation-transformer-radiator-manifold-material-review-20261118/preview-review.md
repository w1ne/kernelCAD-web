# Five-preview ledger — 18 November 2026

All five local 512 × 512 catalog previews were checked against their source, generated triangle count, and described equipment. Exact asset-slug checks against open issues and pull requests are retained in `verification/open-target-check.json`; no overlap was found.

| Asset | Preview evidence | Review result |
|---|---|---|
| `grid-substation/substation-main-power-transformer` | 9,400 triangles; tank, radiator banks, conservator, and porcelain bushings are visible in the expected layout. | Recognizable; no material mismatch selected. |
| `grid-substation/substation-oil-cooling-pump-skid` | 144 triangles; a skid, pump housing, motor cylinder, and pipe blocks are visible, though the preview is low-detail. | The object reads as a pump skid only with its name; retained as a future silhouette review, no second change in this round. |
| `grid-substation/substation-station-battery-rack` | 248 triangles; two tiers of separate battery cases sit on two shelves. | Recognizable; no material mismatch selected. |
| `grid-substation/substation-dead-tank-breaker` | 6,544 triangles; three breaker tanks, six porcelain bushings, support frame, and mechanism cabinet are visible. | Recognizable; no material mismatch selected. |
| `grid-substation/substation-transformer-radiator-bank` | 200 triangles; the fin bank and headers are clear, but the two orange manifolds read as copper conductors. | Selected: oil-side manifolds are steel components, not copper conductors. Reassigned both to the existing stainless-steel control; retired the now-unused copper knob and preset values. |

The selected edit changes only the material assignments and the dead copper control; no geometry, scale, triangle budget, or preset names changed. The model remains 200 triangles under its 1,800-triangle budget and 3.9931 × 2.2700 × 2.8010 m at default scale.
