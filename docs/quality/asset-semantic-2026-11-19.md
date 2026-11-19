# Asset semantic review — 2026-11-19

## PR state and sample

PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was merged on
14 November with its reported CI checks successful and no submitted review.
The active catalog PR [#1507](https://github.com/w1ne/kernelCAD-web/pull/1507)
was checked before sampling at head `0f0f994523a6f14fb1b64d6325a24214f7886266`;
its non-skipped checks were successful, no review had been submitted, and
GitHub reported a `BLOCKED` merge state.

Reviewed five current industrial-plant catalog previews:
`air-compressor`, `baghouse-dust-collector`, `bucket-elevator`, `forklift-truck`
and `weigh-hopper`. The exact issue title/body and PR title/body/path checks
found no selected asset overlap. The candidates do not overlap the known fix
paths in PRs #1298, #1305, #1307 or #1308. The saved target audit also captures
the live public pages, source files, preview hashes and PR state in the
[review bundle](../../artifacts/catalog-demos/industrial-plant-air-compressor-pump-fin-material-review-20261119/README.md).

All five live page/source/preview routes returned HTTP 200. Their current public
source and preview hashes matched the local selection baseline. The preview
ledger records the dimensions, recognizable features and material observations
for all five assets.

## Finding and correction

The air-compressor preview showed twelve cooling fins on the two finned pump
cylinders in the receiver-steel color, while the pump barrels and heads used the
cast-iron control. All twelve fins now use the existing `pumpIron` control.
Geometry, dimensions, parameters, presets, triangle budget and asset identity
are unchanged. The four other reviewed previews had no selected material
mismatch.

## Verification

- The exported-GLB regression failed against the original source and passed
  after the material remap (1/1). It checks all twelve fin colors, their palette
  assignment, both pump barrels and heads, presets, parameters, triangle count
  and envelope.
- Industrial-plant ESLint is clean.
- The full catalog integration run passed 158 files / 228 tests, including the
  exhaustive source/export/index freshness check.
- All 60 industrial-plant previews were regenerated; 19 preview PNGs changed.
  The generated catalog index remains at 2,402 assets / 50 kits. Only the
  `industrial-plant/air-compressor` index row changed, with a current source
  hash and existing preview path.
- The material/preset quality scan passes industrial-plant at 60/60 (100%). The
  global scan reports 2,398/2,402 (99.83%); its four unchanged below-gate assets
  are in `standard-components`.
- Three regenerated previews were opened after the render pass and confirm the
  compressor, baghouse and forklift silhouettes remain recognizable in color.
- The [15.03-second MP4](../../artifacts/catalog-demos/industrial-plant-air-compressor-pump-fin-material-review-20261119/review-demo.mp4)
  shows the five-preview sample, before/after render, material map and local
  checks. It does not show deployment, pump performance, simulation or hardware
  acceptance.

The source and preview correction is local to this feature branch. The public
site remains at the pre-change baseline because no deployment was performed.

## Mining sample — tailings stack conveyor

The second five-preview audit checked `core-drill-rig`,
`overland-conveyor-bridge`, `stacker-reclaimer-boom`,
`tailings-stack-conveyor` and `ore-sorting-arch`. Their source and preview paths
were clear of open issue/PR targets and the known fix branches. PR #1258 was
merged with all 17 reported checks successful; PR #1507 was open with its
applicable reported checks successful and GitHub's merge state `BLOCKED` at the
pre-change check. The [mining review bundle](../../artifacts/catalog-demos/mining-tailings-stack-conveyor-crawler-track-material-review-20261119/README.md)
retains the PR snapshot, live public baselines and five-item preview ledger.

The tailings stacker's two crawler track bodies and eighteen grousers were
assigned to the belt-rubber color control. All twenty now use the existing
crawler-steel control. The conveyor belt and rubber-lagged head pulley stay on
the rubber control; geometry and user-facing controls are unchanged.

The exported-GLB regression passes (1/1), mining-kit ESLint is clean, and the
full catalog integration suite passes 159 files / 229 tests, including the
2,402-asset freshness check. The index row and source hash are current. The
mining quality scan is 50/50 (100%); the global scan is 2,398/2,402 (99.83%),
with four existing below-gate assets in `standard-components`. Three rendered
previews were reopened after rendering. The local review MP4 is linked from the
bundle; it shows software previews and an exported-GLB regression only. The
public site remains at its pre-change state because no deployment was made.
