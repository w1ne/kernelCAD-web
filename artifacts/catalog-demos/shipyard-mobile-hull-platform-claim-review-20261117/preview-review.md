# Five-preview ledger — industrial/manufacturing semantic screen

Checked 2026-11-17. Five previews were opened directly. Dimensions are
`X × Z(up) × Y`, from the generated catalog index. None of the four other
samples showed a clear color/material-role mismatch. The shipyard platform had
a false adjustment claim in its indexed description; that claim was corrected.

| Asset | Size (m) | Triangles / budget | Preview observation | Result | Source SHA-256 (before) | Preview SHA-256 (before) |
|---|---:|---:|---|---|---|---|
| `construction-equipment/concrete-batch-plant` | 1.917 × 2.176 × 1.476 | 1,500 / 2,200 | The compact plant reads from the preview as three aggregate bins with tapered outlets, a mixer/feed area, a framed cement silo, and a control cabin. Equipment enamel, bin coating, cement-silo finish, and steel are visually distinct and plausible. | No material or label mismatch found. | `8b3d625a196277d9e72ce494494f63d92dfe040eb58c5c5791591a345bcc677b` | `4eafef3970c612c3445cc0720ff546886ad7bd268d48199151e1c4d97783472a` |
| `grid-substation/substation-gas-insulated-breaker-module` | 3.300 × 2.530 × 1.300 | 768 / 1,800 | The sealed enclosure sits on a separate base; three ribbed bushings and their terminals plus the small service cabinet are visible. The powder-coated enclosure, porcelain, copper terminals, and galvanized base are separated. | No clear material or silhouette mismatch found. | `54b1d7f067b777371fc1eca516fe817316cd2926a9cb0d983a2fee9c65666a00` | `03b97ed196c363d3a44be2fa04514cdae0f583306f69c8a6322b32a23d6a17c3` |
| `recycling-facility/aerosol-can-safety-drum` | 0.800 × 1.564 × 0.790 | 2,662 / 3,200 | The red drum, lid-mounted puncturer/filter, hazard labels, and yellow spill pallet read as an aerosol-can recovery drum. Steel, polyethylene, aluminum, and filter finishes are distinct. | No material or label mismatch found. | `32b0a1249fe2fc9333d3b18ff9865daaa8cff7116bf33cf2910a7f3d11fb4a4c` | `8d6ada75961726872fa23330365e013a9c7d02de6643a3b10dc5ef762dc3bd5b` |
| `mining/mill-relining-machine` | 13.400 × 3.300 × 2.710 | 2,232 / 3,000 | Rail carriage, long reach boom, operator cab, power unit, and curved liner load are visible; the yellow machine finish, dark frame/hoses, and liner steel remain separate. | No material or label mismatch found. | `685ebac8e76234220296713a05c84ec3f46b66c4df60db6d68dd071787ac270f` | `1dcb930a1be7c30e9bc6f95ac1870e12838c4b6e98850de4c8d96b1365dde8d9` |
| `shipyard/mobile-hull-access-platform` | 1.785 × 1.355 × 1.385 | 592 / 1,800 | The deck, four support posts, perimeter rails, four elastomer wheels, and access step read as a small rolling platform. Yard finish, steel, and elastomer are plausible. The source has fixed posts; the public description incorrectly said “adjustable-height.” | Corrected the description to “fixed-height support posts”; no geometry or material change. | `f59ad65d23f8c82da8ad4d9c5346fcd1d0614fff4120064186eda78210bb4d55` | `89e06228c9019924ba62363cde8d86142178010ce88c741039241b15586649e8` |

## Target and page checks

- Searched all 9 open PRs and all 9 open issues on 2026-11-17. None names the
  five sampled IDs. PR #1507's changed catalog sources were excluded.
- Baseline live detail page:
  `https://kernelcad.com/catalog/shipyard/mobile-hull-access-platform/` returned
  HTTP 200 and contained the unsupported claim. The captured status and text
  are recorded in `verification/public-page-before.json`.
- The private dated comparison is recorded in
  `kernelCAD-private/docs/competitors/2026-11-17-shipyard-mobile-access-platform-semantics.md`.

## Corrected asset evidence

- Source SHA-256 after correction: `f61709ba28d6957256bacda3c7519d7ccc185492789a41417ca1461360988109`.
- Regenerated index row source SHA-256 matches the source; the only index row
  changed is `shipyard/mobile-hull-access-platform` (description and source hash).
- Preview bytes changed during re-render, but the decoded 512 × 512 RGBA images
  are pixel-identical. See `verification/preview-pixel-compare.json`.
- Focused regression passes and the generated local detail page contains the
  corrected description; see `verification/test-summary.txt` and
  `verification/local-page-check.json`.
