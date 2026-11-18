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
