# Beverage bottling preview ledger — 2026-11-13

Selection rule: beverage-bottling-line machines that no earlier bundle under
`artifacts/catalog-demos/` or ledger under `docs/quality/` names, and that no open
issue or PR targets (open PR list checked on 2026-11-13: #1258, #1253, #1215, #1211;
none touches these IDs). Samples in `samples/` are the pre-change previews.

| Asset | Preview reads as | Material check | Result |
|---|---|---|---|
| beverage-bottling-line/sanitary-filter-skid | Twin vertical cartridge housings with lids on a painted skid | **`filter-housing-0/1` used `powderCoat`; the lids, headers and the asset's own text say stainless** | **Fixed** |
| beverage-bottling-line/rotary-capper | Round turret with top plate, eight capping heads, cap-feed hood, front guard | Turret and top plate stainless; base, hood, guard powder coat; heads `foodPolymer` (name matches `cap`) | No clear defect: capping chucks commonly carry polymer inserts. Recorded: the eight heads have no spindles to the top plate |
| beverage-bottling-line/cip-supply-return-skid | Two solution tanks, pump and motor, plate exchanger, control cabinet on a painted skid | Tanks, lids, pump, exchanger plates, headers stainless; motor, cabinet, skid powder coat | No material defect. Geometry recorded: `supply-header` and `return-header` are vertical poles (Z-axis cylinders), not horizontal pipe runs |
| beverage-bottling-line/shrink-bundle-wrapper | Portal frame over a product bed, film reel and rollers, control pod | Frame, legs, bed powder coat or stainless; film parts `foodPolymer` | No material defect. Geometry recorded: no shrink film web or bundle; reads as a generic portal frame |
| beverage-bottling-line/case-erector | Tall case magazine, pick head, squaring frame, flap-folding rails, HMI post | Frame, rails, platform powder coat; magazine and pick head stainless | No clear defect. Recorded: magazine holds no corrugated blanks, so the silhouette does not show the product |

## Finding

The skid's shared `finishPart` regex paints any part whose name contains `housing`
with `powderCoat`. The two cartridge filter housings matched, so they rendered teal
under stainless lids. The asset comment and description say "twin stainless
cartridge housings". Sanitary cartridge housings in beverage service are stainless
pressure parts. `housing` is removed from this file's paint regex; no other part
in the file contains that token. Both housings now use `stainlessSteel`. Skid and
feet keep `powderCoat`. Geometry, 360 triangles, controls and presets do not change.

Recorded, not fixed (geometry): `inlet-header` and `outlet-header` are vertical
poles that rise above the housings, not horizontal headers; the `branch-0/1` boxes
sit inside the housings; the description names a drain that the model does not have.
