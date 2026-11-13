# Water-treatment preview ledger — 2026-11-13

Five checked-in rendered previews were selected after exact-name searches of
open issues and pull requests and a search of earlier catalog review bundles.
No open issue or PR specifically targets these five asset paths; PR #1258 is the
existing umbrella catalog PR for this branch.

| Asset | Rendered observation | Result |
| --- | --- | --- |
| `activated-carbon-filter-vessel` | Tall filter vessel with domed ends, top hatch and two separate side ports. | No material mismatch found. Support legs described by the source are not visible in the preview; retained as a separate geometry follow-up. |
| `dual-pump-manifold-skid` | Two pump bodies and a shared skid are visible, with two tall pipe segments standing between the pumps. | No material mismatch found. The two header segments appear vertical and do not visibly connect to the pumps; retained as a separate geometry follow-up. |
| `aeration-basin` | Open concrete basin with contrasting structural steel spanning above it. | No material mismatch found. |
| `sodium-hypochlorite-cabinet` | Coated dosing enclosure on a separate dark structural base, with a small process fitting visible at the side. | No material mismatch found. |
| `sludge-thickener-tank` | Concrete circular basin and rim with a steel bridge; the center drive housing was inside the feed well and shared the basin's concrete finish. | **Material mismatch. Fixed:** the center drive now sits above the feed well with its own cast-iron control, and the scraper arm uses structural steel. |

The thickener correction raises the existing drive above the feed well so its
separate cast-iron finish is visible in the preview. The mesh remains 500
triangles under the 2,200-triangle budget; the envelope changes from
1.07 × 0.74 × 1.07 m to 1.07 × 0.85 × 1.07 m. The source-driven before and
after previews are retained under `previews/`; all five audit samples are
retained under `samples/`.

The exposed center drive is corrected in this round. The two geometry follow-ups
above are recorded separately and are not claims of vendor-specific fidelity.
