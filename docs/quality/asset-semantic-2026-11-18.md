# Semantic asset review — 2026-11-18

The mining preview audit found a material-role mismatch in the crusher
discharge conveyor: 46 troughing and return idler roller shells used the
drive-and-chute paint colour even though the adjacent idler supports use the
frame-steel finish. The source now assigns those roller shells to the existing
frame-steel control. The geometry, triangle count, public parameters and
presets are unchanged.

The focused GLB regression checks all 46 roller colours and representative
painted equipment parts. The review ledger, preview captures and verification
evidence are linked from the
[crusher conveyor handoff bundle](../../artifacts/catalog-demos/mining-crusher-discharge-conveyor-idler-material-review-20261118/README.md).

The public catalog page was checked during review. This source change has not
been deployed; the live page therefore still reflects the published baseline.

## Recycling-facility follow-up: no confirmed mismatch

After checking PR #1258 (merged, reported CI checks passed) and current catalog
PR #1507 (open, checks passed, no review submitted), five different
recycling-facility machinery previews were reviewed: `green-waste-shredder`,
`plastic-film-compactor`, `plastic-flake-silo`, `recovered-plastic-bagger`, and
`product-pelletizer`. Their silhouettes read as the named equipment and the
visible material zones were coherent. The rendered physical features and
catalog mesh envelopes were also checked; no material, scale, or label
mismatch was established.

No open issue or PR source path matched these assets. The known merged fixes
#1298, #1305, #1307, and #1308 also do not touch these source files. All five
public detail pages and previews returned HTTP 200, and the public preview
hashes matched the checked-in PNGs. The [five-preview ledger and inspected
video](../../artifacts/catalog-demos/recycling-facility-five-preview-audit-20261118/README.md)
retain the source snapshots, public baseline, exact target audit, index rows,
render settings, and verification evidence.

No asset, test, preview, or generated index row changed. This was a local
software-preview review and a public-baseline check; it does not claim
simulation, deployment of a change, or hardware acceptance.

## Shipyard audit: spreader contact pads

After confirming PR #1258 was merged with all reported checks successful and
no submitted review, five shipyard previews were checked: `hull-block-spreader-beam`,
`plate-pack-transfer-cart`, `pipe-rack-fork-pocket`,
`weld-consumable-issue-cage`, and `shipfitter-tool-cabinet`. Paginated changed
file lists and title/body scans for all six open PRs, all eight open issues,
and tracked fixes #1298/#1305/#1307/#1308 found no target overlap. The five
public detail pages, source files, and previews returned HTTP 200; the live
source hashes matched their local pre-edit copies.

The `hull-block-spreader-beam` source described four end shoes as soft-contact
but assigned them the same `yardPaint` control as the beam and drop links. The
shoes now use a separate `elastomer` control, with values in both existing
presets. Dimensions, geometry, and the 380-triangle mesh are unchanged. The
baseline-failing exported-GLB regression checks all four shoes against the
default elastomer color.

The audit also recorded two geometry/label concerns without changing them in
this material-focused pass: `plate-pack-transfer-cart` shows a disconnected
push bar, and `weld-consumable-issue-cage` has no mesh infill despite its
mesh-style description. The other two unchanged previews read as a pipe rack
and a shipfitter's cabinet. The [handoff bundle](../../artifacts/catalog-demos/shipyard-hull-block-spreader-beam-elastomer-pad-material-review-20261118/README.md)
retains the sources, rendered sample PNGs, site baseline, verification, and
inspected MP4. This is a local software-preview and GLB-material check; it does
not establish rated lifting capacity, safety, simulation, deployment, or
hardware acceptance.

## Construction-equipment audit: road-reclaimer cutting teeth

PR #1258 was checked first: it is merged with all 17 reported CI checks
successful and no submitted review. Current PR #1507 was open with its
applicable build, changed-test and lint checks successful and no submitted
review. Five construction-equipment preview IDs were searched against the open
issue and PR lists; none was a named target, none is changed by #1507, and the
merged fixes #1298, #1305, #1307 and #1308 touch different kits.

The audit opened `articulated-dump-truck`, `asphalt-transfer-conveyor`,
`ride-on-concrete-saw`, `road-reclaimer` and `water-tanker-truck`. The detailed
ledger records their visible object features, material zones, dimensions,
triangle counts and unresolved silhouette/scale concerns. In
`road-reclaimer`, seven modeled cutting teeth were colored as equipment enamel
while the cutter drum was structural steel. All seven parts now use the
asset's existing `structuralSteelColor` control. No new color controls or
presets were added; geometry, dimensions and the 816-triangle mesh are
unchanged. The default preview remains byte-identical because the hood occludes
the teeth; the focused paired software renders and exported-GLB regression make
the source-level material correction reviewable.

The kit ESLint and material/preset quality gate passed; the construction
equipment gate reports 60/60 assets (100%). The current global gate reports
2,398/2,402 (99.83%), with four unchanged thin assets in `standard-components`.
The regenerated index records the current source SHA-256 and the existing
preview path. The full catalog integration suite passed 151/151 files and
221/221 tests, including index freshness. Exact verification logs and the
inspected MP4 are retained in the [road-reclaimer handoff
bundle](../../artifacts/catalog-demos/construction-road-reclaimer-cutting-tooth-material-review-20261118/README.md).

The indexed envelope and simplified machine silhouette remain unresolved
semantic concerns; this material correction does not address them. The public
page was checked before the branch change. The source is not deployed, and the
software preview is not an equipment simulation or hardware-acceptance result.

## Beverage bottling line: carton-sealer tape head

PR #1258 was merged with all reported checks successful and no submitted
review. The five rendered previews `cap-feed-hopper`, `slip-sheet-dispenser`,
`stretch-wrapper`, `wraparound-labeler`, and `carton-bottom-sealer` were checked
against current open issues and PRs; none of the selected source paths or IDs
was targeted. No material mismatch was established in the first four samples.

In `carton-bottom-sealer`, `finishPart` matched `tape-head` through the generic
`tape` token and colored the metal applicator mechanism as food-grade polymer.
The part now uses the existing `stainlessSteel` control; `tape-roll` remains on
`foodPolymer`. Geometry, IDs, presets and the 176-triangle mesh are unchanged.
The focused GLB regression failed against the baseline source and passes with
the correction. The rendered preview was regenerated and the catalog index
rebuilt with its current source hash. The [handoff bundle](../../artifacts/catalog-demos/beverage-carton-bottom-sealer-tape-head-material-review-20261118/README.md)
contains the five-preview ledger, live baseline, before/after captures, test,
verification logs and inspected MP4. A dated official equipment-material
comparison is retained in `kernelCAD-private`.

The public detail page, source and preview matched the pre-edit branch baseline
before the change. The feature branch is not deployed; this is a local
software-render and GLB material check, not simulation or hardware acceptance.

## Shipyard: plate roller conveyor side-frame finish

After checking PR #1258 (merged, all 17 reported checks successful, no submitted
review), five unreviewed shipyard manufacturing previews were opened:
`coating-mix-cabinet`, `optical-measurement-station`,
`pipe-spool-saddle-stand`, `plate-roller-conveyor`, and
`temporary-work-light-mast`. Seven open issues, six open PRs, the full 1,622-file
current PR #1507 diff, and fixes #1298/#1305/#1307/#1308 had no selected-ID or
source-path overlap.

The `plate-roller-conveyor` preview shows six transverse rollers between two
side frames. The frames have matching 2,550 × 140 × 280 mm geometry and the
same structural role, but `side-frame-0` used `yardPaint` while
`side-frame-1` used `structuralSteel`. The latter now uses `yardPaint`; all
rollers, guide rails and feet retain structural steel. The asset remains at 440
triangles against its 1,800-triangle budget. No geometry, dimensions, controls
or presets changed.

The exported-GLB regression failed on the baseline and passed after the fix.
The shipyard ESLint and asset-quality gate passed; the gate reports 70/70
assets (100%). The refreshed global gate reports 2,398/2,402 assets (99.83%);
four thin assets remain in `standard-components`. Its exact output is retained
in the handoff bundle. The targeted default preview was regenerated and the
catalog index rebuilt. Its source SHA-256 matches the edited source and the
preview path exists. All five public pages and preview PNGs returned HTTP 200; current
public preview hashes match the retained pre-edit baseline. The [five-item
ledger and inspected demo bundle](../../artifacts/catalog-demos/shipyard-plate-roller-conveyor-side-frame-material-review-20261118/README.md)
retain source snapshots, PNGs, public checks, target scans and verification
logs. The full catalog integration suite was not rerun locally. After the push,
workflow dispatch `44417158008` ran against the exact head
`5c42a991c28bf41b6c811af739187ee904f551b6`. Catalog-index freshness,
changed-source preview validation, lint, build/typecheck and seven of eight
test shards passed. The overall run failed on one quality-ratchet finding in
`src/modeling/capture/proxy.ts` (`max-lines=820`): the file is 1,576 lines in
this branch and 1,498 on current `develop`, and this catalog commit does not
change it. The [CI result and failure excerpt](../../artifacts/catalog-demos/shipyard-plate-roller-conveyor-side-frame-material-review-20261118/verification/ci-after-push.md)
are retained with the handoff bundle. The focused GLB regression, ESLint,
shipyard asset-quality gate and local index build passed; the full CI suite is
not claimed green.

## Construction-equipment follow-up: core-drill barrel finish (18–19 November UTC)

PR #1258 was checked first: it is merged, its 17 reported checks succeeded, and no review was submitted. At sample selection PR #1507 was open at `d1e2c36854b4f33b78726828ed7bb61cbdf60d65`; its applicable checks succeeded, it had no submitted review, and GitHub reported `BLOCKED`. Six open PR changed-file lists, seven open issue titles/bodies, and known fix PRs #1298/#1305/#1307/#1308 had no selected-ID/source-path overlap.

The five rendered construction-equipment previews opened were `asphalt-paver-screed`, `rebar-bending-machine`, `masonry-mixer`, `jobsite-tile-saw`, and `portable-core-drill-stand`. Their object, material and envelope observations are in the [five-preview ledger](../../artifacts/catalog-demos/construction-portable-core-drill-bit-material-review-20261118/preview-review.md). Four had no selected material mismatch. The screed preview still reads as a narrow beam and housing; the description claims folding wings and adjustment links that are not visible. That geometry/description gap is recorded but was not changed in this material-only round.

In `portable-core-drill-stand`, `core-bit` used the yellow `equipmentPaintColor` control. It now uses the existing `structuralSteelColor`; the base and guide column remain painted, and the carriage and feed handle remain steel. No asset, kit, color parameter or preset was added. Geometry is unchanged at 92 triangles and 0.5616 × 1.1046 × 0.4000 m. The regenerated index changed only the target row's description, palette and source hash; its source SHA-256 matches disk and its rendered preview path exists.

The new exported-GLB regression failed against the baseline palette assignment and passed after the correction. ESLint passed for the construction-equipment kit and regression. The structural quality gate reports 60/60 assets (100.00%); this is not a semantic realism score. The full catalog integration suite passed **157/157 files and 227/227 tests** (100%), including the full-catalog source/export/index-freshness check. The [handoff bundle](../../artifacts/catalog-demos/construction-portable-core-drill-bit-material-review-20261118/README.md) retains before/after sources and previews, the five sample images, index evidence, checks, settings and an inspected 15-second MP4.

Before editing, the public core-drill detail page, source and preview returned HTTP 200; the live source and preview matched the local baseline. The feature branch is not deployed. Verification covers local software previews and an exported-GLB material regression, not simulation or hardware acceptance. The dated official product, documentation and workflow comparison is retained privately in `kernelCAD-private`; this public record describes only native kernelCAD behavior.
