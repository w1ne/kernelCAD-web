# Five-preview mining equipment review — 19 November 2026

## Selection

PR #1258 was merged on 14 November with all 17 reported checks successful and
no submitted review. The active catalog PR #1507 was checked at its current
head before the sample; selected mining source and preview paths were searched
against every open issue, all four open PRs, and fixes #1298, #1305, #1307 and
#1308. No overlap was found. None of these five assets appears in an earlier
semantic preview ledger. The timestamped result and PR states are in
[`verification/open-target-check.json`](verification/open-target-check.json).

All five current public detail pages, source files and preview routes returned
HTTP 200. Public source and preview hashes matched their local baseline for
each selected asset. See [`live-baseline/public-check.json`](live-baseline/public-check.json).

## Five-preview ledger

| Asset | Baseline envelope (m) | Baseline triangles | Preview observations |
|---|---:|---:|---|
| `mining/core-drill-rig` | 8.3 × 11.131977 × 6.4 | 2,172 | Mast, raising lines, drill head and string, engine enclosure, mud tank and core trays read as an exploration core drill. Coated steel, structural steel, chrome and timber are distinct. No mismatch selected. |
| `mining/overland-conveyor-bridge` | 26.4 × 8.5 × 12 | 4,760 | Trussed belt gallery and braced towers cross a marked haul road. Truss, hood, rubber belt and ore zones are distinct. No mismatch selected. |
| `mining/stacker-reclaimer-boom` | 58 × 17.8 × 35.92 | 4,544 | Rail-mounted stacker/reclaimer, lattice boom, bucket wheel, yard belt and stockpile read clearly. Machine paint, frame steel, rubber and ore remain distinct. No mismatch selected. |
| `mining/tailings-stack-conveyor` | 31.303732 × 8.344869 × 16.150847 | 3,792 | Elevated tailings belt, discharge pile and crawler carrier are visible. The two track bodies and eighteen grousers used the `beltRubber` control and rendered nearly black. These are steel crawler components; **corrected** to the existing `crawlerSteel` control. |
| `mining/ore-sorting-arch` | 7.88 × 4 × 3.96 | 2,682 | Feed hopper, belt, sensor arch, X-ray shielding tunnel, ejector row, split chutes and control cabinet make the sorter recognizable. Housing, frame, accent and ore colors are distinct. No mismatch selected. |

Dimensions and triangle counts are generated catalog mesh measurements, not
vendor-verified manufacturing specifications. The review covers visible
software previews and source material assignments.

## Selected correction

The source assigned `track-0`, `track-1`, and all eighteen `grouser-*` parts to
`beltRubber`. They are the crawler carrier's track shoes and raised traction
cleats, and the asset already provides `crawlerSteel`. Those twenty parts now
use `crawlerSteel`. The conveyor carry belt and rubber-lagged head pulley remain
on `beltRubber`. Geometry, dimensions, triangle budget, parameters, presets and
asset identity are unchanged.

The before/after preview pair shows the crawler changing from the belt's near
black to the carrier's dark steel. The target remains a 3,792-triangle model in
the same 31.303732 × 8.344869 × 16.150847 m envelope.

## Verification

- The exported-GLB regression failed on the original source because the tracks
  and grousers were absent from the `crawlerSteel` palette; it passes after the
  remap. It checks all twenty exported parts, their material palette and GLB
  colors, retained rubber belt parts, the parameter/preset names, triangle
  count, budget and envelope.
- The full `npx vitest run tests/integration/catalog/` run passed: 159 files,
  229 tests. This includes the 2,402-asset export and committed-index freshness
  check.
- `npx eslint catalog/kits/mining/ tests/integration/catalog/miningTailingsCrawlerTrackMaterial.test.ts`
  is clean.
- The target preview was rendered with
  `npx tsx scripts/renderCatalogPreviews.ts tailings-stack-conveyor`, and
  `catalog/index.json` was regenerated. The row's source SHA-256 matches the
  source and its preview path exists.
- The full catalog integration suite and global material/preset quality scan
  results are saved under `verification/`.
- Three rendered previews were reopened after the target render: the tailings
  stacker still reads as a tracked stacker/conveyor; the core drill and
  overland conveyor remain recognizable and colored.
- The mining material/preset quality scan passes 50/50 (100%). The global scan
  reports 2,398/2,402 (99.83%); its four unchanged below-gate assets are in
  `standard-components`.
- The local, software-rendered 15-second review video is
  [`review-demo.mp4`](review-demo.mp4). It shows the five-preview sample, the
  before/after material remap and local verification. It does not show a
  deployment, process simulation, equipment performance, or hardware
  acceptance.

## Provenance and limits

This public handoff describes native kernelCAD asset behavior. Dated official
product and material references are retained privately in
`kernelCAD-private`. The public site was checked before editing; this branch is
not deployed, so no post-change public page update is claimed.
