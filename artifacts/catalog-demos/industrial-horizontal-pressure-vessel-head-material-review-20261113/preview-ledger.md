# Industrial-plant preview ledger — 2026-11-13

Five checked-in rendered previews were selected after searching open issues and
pull requests for each candidate name and reviewing earlier semantic-review
ledgers. No specific open issue or correction PR targets these five assets. PR
#1258 is the existing umbrella catalog feature PR for this branch.

| Asset | Rendered evidence | Disposition |
| --- | --- | --- |
| `belt-conveyor` | Continuous dark belt between guide lips; transverse idlers, drive motor, stringers and braced support stations are visible. | No material mismatch found. |
| `bucket-elevator` | Vertical casing exposes the bucket loop; boot and head housings, ladder and contrasting polymer buckets are visible. | No material mismatch found. |
| `compressed-air-receiver` | Dark steel pressure shell, heads and top fittings sit on yellow saddles and skid rails; gauge glass is distinct. | No material mismatch found. |
| `distillation-column` | Tall clad shell with three platforms, rails, full-height ladder, piping and skirt; shell and access steel are visibly separated. | No material mismatch found. |
| `horizontal-pressure-vessel` | Both end heads and top nozzle necks render safety yellow while the carbon-steel shell and nozzle flanges render steel gray. | **Material mismatch. Fixed:** heads and nozzle necks now use the existing `steel` control. Geometry and 468-triangle count are unchanged. |

The selected source and local previews are retained in `samples/` and
`previews/before/`. The public detail route returned HTTP 403 from this environment,
so this round has no live-site baseline or post-deploy check.
