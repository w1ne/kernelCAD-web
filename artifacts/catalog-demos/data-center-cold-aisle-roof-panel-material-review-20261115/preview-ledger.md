# Five-preview ledger — 2026-11-15 (data-center-infrastructure)

Lane PR #1406 is open (CI pending at round start). The five assets below are not named in any earlier ledger under `artifacts/catalog-demos/`. Open-issue and open-PR searches for the five ids returned no results. No open PR touches the `data-center-infrastructure` kit.

All five checked-in default previews were opened (`samples/`, `previews/before/cold-aisle-roof-panel.png`).

| Asset | Triangles / budget | Source SHA-256 (before) | Preview SHA-256 (before) | Observation |
|---|---:|---|---|---|
| `data-center-infrastructure/cold-aisle-roof-panel` | 196 / 2,200 | `8298ac65bdac16cfa335632bca6ce5432d84f0aaf51937a3acc87302989e78a0` | `ba79b6ba1f6743cf11e95417eaa958de79f9de1fde1b02a91ddb14ce684ba5d9` | **Material defect, corrected.** Five identical 235 x 1,320 x 28 mm containment roof panels. `roof-panel-0` used `polymer` ("Engineering polymer"); `roof-panel-1` to `-4` used `steel` ("Painted steel"), the frame colour. One panel of five rendered amber, the other four merged with the frame. Containment roof infill panels are one material, normally a polymer sheet in a steel frame. **Geometry defects, recorded and not corrected:** the canopy sits at `z = 0` on the floor and the two posts rise 2,200 mm from it, so the roof reads upside down; only two diagonal posts; the inspector reports `mechanism.interpenetration` (badge present before and after). |
| `data-center-infrastructure/data-center-plate-heat-exchanger` | 304 / 2,200 | `813533fa5632ed1ce73f43b41f88ee048a8c49a8765d17fa0f2d3406ce4a6a83` | `421ab879f074bb4c3d91888881c389020c2ba56ba69f51592f83af172acfdabb` | **Material defect, recorded and not corrected:** `outlet-flange` uses `polymer`; `inlet-flange` uses `steel`. Pipe flanges on a plate exchanger are metal. Not fixed this round: `polymer` has no other part, so the fix needs a real polymer part (plate gaskets) or a knob change. **Geometry defect:** the solid `plate-stack` box encloses all 14 plates, so no plate is visible; no tie bars, although the description names them. |
| `data-center-infrastructure/overhead-coolant-header` | 392 / 2,200 | `7c2ff34a89e4b2fe4df5fd9b3259e6281dc14f1a09af0ad1716cab9d969a3c79` | `51cab108f2a003a4b6055150f63fbe90d40a2cbcf16a3330ee941d599c33643c` | **Material defect, recorded:** `hanger-left` uses `polymer`, `hanger-right` uses `steel`; the same part pair. Same orphan-knob limit as above. **Geometry defect:** the hangers are free-standing slabs beside the pipes, not rods or clamps that carry them. |
| `data-center-infrastructure/liquid-cooling-manifold` | 552 / 2,200 | `9593dd25358249511a11d32b7b6f3c85d40a4f772597e5002d33507f703fe90d` | `9cf8c6eefba88f578252ce8e044de7440b84749dd6ffefe533381ce09ca2a540` | **Material defect, recorded:** `support-base-left` uses `polymer`, `support-base-right` uses `steel`. **Geometry defect:** the support bases do not touch the headers; the branch drops end in mid-air. |
| `data-center-infrastructure/overhead-power-busway` | 140 / 2,200 | `4a301e802883fa8bcbd889cedb4e77db6443808f7c1b99629f3ef2efa5c00973` | `59d0810fb2a0addc88da8ff8d44836f8297459c7c738f3e6244e0462eaceff67` | **Material defect, recorded:** `cover-joint-0` uses `polymer`; `cover-joint-1` to `-3` use `steel`. Same orphan-knob limit. |

## Correction

Only `cold-aisle-roof-panel` is changed. `roof-panel-1` to `roof-panel-4` now use `polymer`, as `roof-panel-0` already did. This fix keeps both colour controls in use: `steel` stays on the frame, beams and posts; `polymer` is now the full roof infill. Geometry, part names, triangle count (196), the two colour controls, their defaults and the two presets are unchanged. `scripts/checkCatalogQuality.py --kit data-center-infrastructure`: 50/50 pass.

Regression: `tests/integration/catalog/coldAisleRoofPanelMaterial.test.ts` reads the palette zones and the exported GLB colours. It fails on the baseline source (`expected [ 'roof-panel-0' ] to deeply equal ArrayContaining{…}`, see `verification/test-before.txt`) and passes after the fix.

## Evidence

- Default catalog preview, before and after: `previews/{before,after}/cold-aisle-roof-panel.png`. 8,774 pixels differ (difference > 8 on any channel), all inside the roof area (bounding box x 167-371, y 306-391). Enlarged crops: `previews/{before,after}/roof-crop.png`.
- Inspection views from `npx kernelcad render inspect catalog/kits/data-center-infrastructure/cold-aisle-roof-panel.kcad.ts <out>`: `previews/{before,after}/inspect-{iso,top}.png`.
- Review MP4 (21 s): `data-center-cold-aisle-roof-panel-material-review.mp4`, built by `make_demo.sh`. Two decoded frames (before default preview at 1.5 s, after default preview at 19 s) were opened and read correctly.
- Software-rendered branch evidence only. This branch is not deployed; the public page still serves the before preview. No vendor drawing or physical part is claimed.

## Patterns for a later round

- The `data-center-infrastructure` generator often gives the `polymer` knob to one member of a repeated pair or series, or to one base part: `roof-panel-0`, `outlet-flange`, `hanger-left` (coolant header), `support-base-left`, `cover-joint-0`, `hanger-cap-left`, `base-skid` (condenser pump skid), `support-skid` (day fuel tank), `base-plinth` (in-row cooler), `register-curb`, and `tile-panel` (two floor tiles). That is 12 assets. Some may be valid (a laminate floor-tile top); the paired cases are not. Most need a real polymer part (gasket, cap, label) rather than a colour swap, or the second knob becomes unused.
