# Asset semantic review — 17 November 2026

## Gate and sample

Checked PR #1258 before sampling: it is merged, all 17 reported CI checks
succeeded, and no review was submitted. The current catalog PR is #1507. At
baseline it was open with its required checks successful; its nine changed
industrial-plant assets do not overlap the five reviewed below. Exact open
issue/PR checks and the status snapshot are in the
[handoff bundle](../../artifacts/catalog-demos/industrial-plant-plc-control-rack-status-led-material-review-20261117/README.md).

Reviewed rendered previews for `pallet-rack-bay`, `plc-control-rack`,
`electric-pallet-jack`, `vertical-storage-tank`, and `diesel-generator-set`.
The [five-preview ledger](../../artifacts/catalog-demos/industrial-plant-plc-control-rack-status-led-material-review-20261117/preview-review.md)
records the visible identity and materials for every sample. The five public
preview PNG hashes matched the branch renders before editing.

## Finding and correction

`plc-control-rack` applied safety paint to all 21 status-indicator blocks and to
one of seven otherwise matching I/O card housings. The model now uses steel for
the rack and all card housings, with separate green channel, green RUN, and red
ERROR indicator-lens controls and preset values. The preview remains a generic
kernelCAD scene asset and makes no controller-state or vendor-product claim.

No change was made to the other four sampled assets. Their rendered previews
read as the named equipment and showed no material mismatch established by this
review.

## Verification and evidence

- The new exported-GLB regression failed on the baseline assignment and passed
  after the correction. It checks all 21 indicator nodes, seven card housings,
  rack supports, four color controls, both presets, and the unchanged
  384-triangle count.
- The after preview is visually inspected and stored with its source and the
  before/after pair in the linked handoff bundle. The bundle includes the five
  reviewed source/preview pairs, generated index evidence, local verification
  logs, public baseline pages/previews, and a decoded/inspected MP4.
- `npx vitest run tests/integration/catalog/` passed all 135 files and 205
  tests, including the full catalog/index freshness export. The exact output is
  in the [handoff bundle](../../artifacts/catalog-demos/industrial-plant-plc-control-rack-status-led-material-review-20261117/verification/catalog-integration-tests.txt).
- Verification claims distinguish local software preview and exported-GLB
  regression from simulation, deployment, and hardware acceptance. The branch
  remains undeployed.
- The industrial-plant structural gate passes 60/60 (100%). The global
  mechanical scan reports 2,398/2,402 (99.83%); its four non-passing rows are
  in `standard-components`, outside this change. Neither mechanical result
  proves semantic realism.

The handoff bundle records the full catalog integration result for this
revision.

## Mining follow-up audit

After rechecking the PR and open target list, five mining previews were reviewed:
`cone-crusher-module`, `jaw-crusher-module`, `ball-mill`, `mine-locomotive`,
and `mine-ventilation-fan`. One mismatch was corrected: the jaw crusher's
eccentric shaft used the manganese jaw-liner control. It now uses the existing
structural-steel control, while both wear liners remain manganese. Geometry and
the 3,616-triangle count are unchanged.

The [five-preview ledger, before/after renders, GLB regression, generated-index
check, and inspected MP4](../../artifacts/catalog-demos/mining-jaw-crusher-eccentric-shaft-material-review-20261117/README.md)
record this follow-up. The public material-role description stays native to the
kernelCAD asset; no vendor product identity is claimed. The branch is not
deployed, and the local preview/regression do not imply simulation or hardware
acceptance. The full catalog integration suite passed 137 files and 207 tests,
including the complete source/export/index-freshness check.

## Shipyard follow-up audit

Five rendered shipyard previews were checked after PR #1258's merged CI was
confirmed green: `caisson-ballast-manifold-stand`, `electrical-test-cart`,
`hull-block-fabrication-jig`, `dock-gate-caisson`, and `ship-lift-cradle`.
None matched an open issue or PR target at selection time. The two base rails
on `hull-block-fabrication-jig` had different colors despite mirrored, matching
profiles. The second rail now uses the existing `yardPaint` control to match
the first; structural steel stays on the cross rails, towers, and alignment
beams. Geometry, dimensions, presets, and triangle budget are unchanged.

The [five-preview ledger, before/after previews, baseline-failing and passing
exported-GLB regression, regenerated index evidence, and inspected MP4](../../artifacts/catalog-demos/shipyard-hull-block-fabrication-jig-base-rail-material-review-20261117/README.md)
record this material-only correction. The preview is a local kernelCAD software
render; the branch is not deployed, and no simulation or hardware acceptance is
claimed. A different finish split on the paired rails of `ship-lift-cradle` is
recorded in the ledger for separate review. The shipyard structural quality
gate reports 70/70 (100%); the global scan reports 2,398/2,402 (99.83%), with
four unchanged `standard-components` outliers. The full catalog suite passed
139 files and 209 tests, including the 2,402-asset source/export/index-freshness
check. Neither mechanical count proves semantic realism.

## Shipyard follow-up: ship-lift cradle

Five rendered shipyard assets were checked after confirming no open issue or PR
targeted the selected IDs: `ship-lift-cradle`, `shipyard-block-transporter`,
`plate-rolling-machine`, `weld-fit-up-table`, and `pipe-spool-rotator`. The
paired side rails on `ship-lift-cradle` had different finishes despite having
the same dimensions and guide-rail role. `side-rail-1` now shares the existing
`yardPaint` control with `side-rail-0`; cross ties and guide rollers remain
`structuralSteel`, and hull pads remain `elastomer`. Geometry and the 396-triangle
mesh are unchanged.

The [five-preview ledger, before/after renders, baseline-failing and passing
exported-GLB regression, generated-index evidence, and inspected MP4](../../artifacts/catalog-demos/shipyard-ship-lift-cradle-rail-material-review-20261117/README.md)
record this local material correction. The public asset remains a generic
kernelCAD model; it does not claim a vendor design or universal shipyard paint
standard. Its current public detail page returned HTTP 200 before the change;
this branch is not deployed, so post-deployment behavior is not claimed.

## Recycling-facility follow-up: no confirmed mismatch

PR #1258 was merged with all 17 reported checks successful and no submitted
review. Current catalog PR #1507 was open; its applicable checks were successful
and it had no submitted review. None of the five selected IDs appeared in any
open issue or PR title/body, and no open PR changed their source files.

Reviewed the rendered previews for `compost-bagging-machine`,
`recycling-trommel-screen`, `two-ram-baler`, `conveyor-transfer-tower`, and
`glass-washer-trommel`. All five silhouettes read as their named recycling
equipment and their visible material zones were coherent. No material mismatch
was established, so no asset, preview, index row, or test was changed. The local
PNG SHA-256 matched the public preview for every sample; each public detail page
and preview returned HTTP 200.

| Asset | Visible identity and material check | Local/public preview SHA-256 |
|---|---|---|
| [`compost-bagging-machine`](../../catalog/kits/recycling-facility/previews/compost-bagging-machine.png) | Surge hopper, bag fill/sewing line and palletized sacks; blue machine, steel fittings, green sacks and compost are distinct. No mismatch found. | `b30653b6d694c91a293d7d505aa17cd5fd8532a3d599cf519ece22a281600572` |
| [`recycling-trommel-screen`](../../catalog/kits/recycling-facility/previews/recycling-trommel-screen.png) | Inclined screen drum, feed hopper, overs/fines discharge and braced frame read as a trommel; steel drum, dark belting and gold chutes are distinct. No mismatch found. | `78e74ab493b2895e472e892e702c39dec1df46e6e379d73ddabf550428989da4` |
| [`two-ram-baler`](../../catalog/kits/recycling-facility/previews/two-ram-baler.png) | Feed hopper, baling chamber, hydraulic/power pack and bale ejection read as a horizontal baler; green machine, steel hydraulics and brown bale are distinct. No mismatch found. | `6f395ebea2e0272be99fcbd0efce2d3c458de92596174ff43c6a602bce1aae6e` |
| [`conveyor-transfer-tower`](../../catalog/kits/recycling-facility/previews/conveyor-transfer-tower.png) | Clad transfer tower, inclined gallery, support trestle and outgoing belt are visible; cladding, painted structure and dark belt are distinct. No mismatch found. | `485c5aeb971c6c189ddb0b9774cb35dedd5df70e71032b03cc6052b65991b071` |
| [`glass-washer-trommel`](../../catalog/kits/recycling-facility/previews/glass-washer-trommel.png) | Rotating wash drum, support frame, drive and cullet discharge read as a glass washer; drum, frame, drive and glass zones are distinct. No mismatch found. | `a2834cc2de70a7f41cd07e480820950d94eb9fae0c1335d9155e526cfa6cf087` |

The reviewed public detail pages are [`compost-bagging-machine`](https://kernelcad.com/catalog/recycling-facility/compost-bagging-machine/), [`recycling-trommel-screen`](https://kernelcad.com/catalog/recycling-facility/recycling-trommel-screen/), [`two-ram-baler`](https://kernelcad.com/catalog/recycling-facility/two-ram-baler/), [`conveyor-transfer-tower`](https://kernelcad.com/catalog/recycling-facility/conveyor-transfer-tower/), and [`glass-washer-trommel`](https://kernelcad.com/catalog/recycling-facility/glass-washer-trommel/). No simulation, deployment, or hardware-acceptance claim is made.
