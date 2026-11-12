# KernelCAD asset semantic review — 12 November 2026

## Scope and gates

- Before sampling, PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was open and mergeable at `fc7b9c762e2e9f94733f36aa38fae7d68bca5e8f`; all 17 reported checks succeeded and no review had been submitted.
- Reviewed five shipyard manufacturing previews: `abrasive-blast-pot`, `blast-dust-collector`, `electrode-storage-oven`, `hull-block-paint-booth`, and `airless-coating-pump-cart`.
- Exact open-issue searches returned no targets. Broad open-PR searches matched only the destination PR #1258 for `blast-dust-collector` and `hull-block-paint-booth`; neither source path is in its changed files. The other three had no search matches. The complete output is retained in the [handoff bundle](../../artifacts/catalog-demos/shipyard-blast-dust-collector-filter-media-material-review-20261112/open-target-check.json).
- The five live previews and detail pages returned HTTP 200. The live images matched the checked-in baseline renders byte for byte. The live dust-collector source also matched the baseline source hash, and its detail page exposed `yardPaint` and `elastomer` only.
- Baseline images were opened and reviewed directly. No material mismatch was established in four samples. `blast-dust-collector` assigned its three exposed filter canisters the same yard-paint finish as its steel skid and enclosure.

## Five-preview ledger

| Asset | Baseline envelope (m) | Baseline source SHA-256 | Baseline preview SHA-256 | Observation and result |
|---|---:|---|---|---|
| `shipyard/abrasive-blast-pot` | 1.24 × 1.68 × 0.795222 | `92147d2fe44dcd28ef12ffa35746f393d9205cc17bd079baf9bb78c041fe8d87` | `fa0dc07972c52608ef16110e53debf60b5ee0ac3344b487d4733d2e94a2c8c9c` | Pressure vessel, hopper, lid, hose outlet, handle and two wheels read as a mobile blast pot. Painted vessel, steel handle and elastomer wheels are plausible. No mismatch found. |
| `shipyard/blast-dust-collector` | 2.05 × 2.13 × 0.995 | `8b2ef45d509fb5ac991254da263bf79da04169d55a8fff7a825f513b1c807525` | `1ce0a40f846846992db67b5382c8dc5d2e187a31bd7bcd7c8db611f3a655c88b` | Three filter canisters, inlet duct, fan housing, service door and wheeled skid are recognizable. Before: exposed media shared the enclosure finish. After: the canisters use the new `filterMedia` control; other zones retain their existing finishes. |
| `shipyard/electrode-storage-oven` | 1.32 × 1.76 × 0.89 | `fc9a578e0728257781bf7f184fd4b18b543683296e063affdd9b71341d500a78` | `604196c2173ecbc8739553f22bab101a83101f83cedd1d51e88fbcc0e8a18891` | Twin-door cabinet, control box, vent cap and feet read as an electrode storage oven. Painted cabinet and metal vent/feet are coherent. No mismatch found. |
| `shipyard/hull-block-paint-booth` | 3.13 × 3.18 × 2.34 | `e24b90434125443ef4f7bb044e35e735721e948fcd4d3e962f280ff25b0e91d7` | `1e4b76bc691c44b4906d9db2815b6885f3d24833f840a389157e56b5e8760b42` | Portal frame, side curtains, roof members and extraction plenum read as an open paint booth. Curtain and structural finishes are distinct. No mismatch found. |
| `shipyard/airless-coating-pump-cart` | 1.432176 × 1.39 × 0.81 | `86efcbfee495b93f365e232c470f72ca86b8a2a26e4405ba78e66bfba6efe74d` | `031b56a693ecba192ed6ace86bc8eb95e20d730c1fbeca640227ec56762b48d1` | Wheeled cart, pump/motor housings, reel, handle and casters are visible. Painted assemblies, steel handle and elastomer wheel/hose surfaces are coherent. No mismatch found. |

## Local correction and verification

- `filter-canister-0`, `filter-canister-1`, and `filter-canister-2` now use a named `filterMedia` color control (`#d7ded8`). `fresh-coat` and `weathered-yard` now set that control independently. The yard-painted collector and elastomer casters retain their existing assignments.
- Geometry is unchanged: 356 triangles, within the 1,800 budget, and a 2.05 × 2.13 × 0.995 m envelope.
- The focused exported-GLB regression passed 1/1 and checks the three canister colors, palette assignment, both presets, triangle budget, and envelope. ESLint is clean; `npx vitest run tests/integration/catalog/` passed 41 files / 66 tests, including the all-catalog export and byte-for-byte index freshness check.
- Re-rendered the target preview and regenerated `catalog/index.json` from the catalog sources. The verifier checks source hash freshness, preview presence, all referenced preview files, the unchanged 2,402 asset / 50 kit totals, and that only the target index row changed.
- Updated source SHA-256 is `c85643f747d3fe8dbdc140343e18b9f2c89d35979f87a3d7c9f9d5732aab2dae`; updated preview SHA-256 is `f1d3e8fecd217f1ef4b8a80feebd6fc9579727e8ab4293fb8e50de66355052a0`.
- The local generated detail page exposes `yardPaint`, `filterMedia`, `elastomer`, both presets, and the new preview. The public site remains on the baseline because this branch has not been deployed.
- Shipyard structural gate: 70/70 (100%). Global mechanical scan: 2,401/2,402 (99.96%), with the unchanged `standard-components/beam-coupling` as its sole outlier. These structural counts do not certify semantic realism.
- A 15-second 1280 × 720 MP4 shows the five-preview sample, baseline/result comparison, material mapping and local checks; extracted frames and the contact sheet were visually reviewed.

The [handoff bundle](../../artifacts/catalog-demos/shipyard-blast-dust-collector-filter-media-material-review-20261112/README.md) retains the five sample sources and renders, before/after target images, exact open-target output, current public baseline, source/settings, generated-index checks, test and lint logs, local page check, and visually inspected MP4.

This is a material assignment correction to a generic native kernelCAD scene asset. It is not a vendor-specific design, filtration specification, equipment performance claim, deployment verification, or physical acceptance.

## Second sample — recycling-facility machinery

- Rechecked [PR #1258](https://github.com/w1ne/kernelCAD-web/pull/1258) at head `47a6aefc88099de69ab30240fe42fa152796f711`. It remained open and mergeable; all 17 reported checks succeeded, and no review had been submitted.
- Reviewed five branch-rendered recycling assets: `twin-shaft-shredder`, `optical-sorter-arch`, `overband-magnet-separator`, `glass-washer-trommel`, and `granulator`. Exact open-issue searches returned no matches. The exact source and preview paths did not occur in the public diffs of the other 20 open PRs checked; #1258 is excluded as the destination PR. The complete check record is in the [review bundle](../../artifacts/catalog-demos/recycling-facility-five-preview-semantic-review-20261112/README.md).
- All five local source hashes match their `catalog/index.json` rows and all five checked-in previews exist. Each preview shows the defining parts for its label, with plausible material zoning. No valid material mismatch was found, so no source, preview, test, or generated index was changed.
- Fetched all five live asset sources and previews from `kernelcad.com`; all routes returned HTTP 200. The live and branch hashes match for `twin-shaft-shredder` and `overband-magnet-separator`. For `optical-sorter-arch`, `glass-washer-trommel`, and `granulator`, the public site still serves older source/render pairs (208, 400, and 408 triangles respectively); this branch has 1,420, 3,122, and 1,478 triangles. The branch review is not a deployment claim.

| Asset | Branch render | Observation | Result |
|---|---:|---|---|
| `recycling-facility/twin-shaft-shredder` | 6,112 triangles; 4.18 × 2.45 × 2.24 m | Twin cutter shafts, flared feed hopper, opposed drives, and discharge chute are visible; body paint, cutter steel, drive paint, and safety trim read as distinct zones. | No material mismatch found. |
| `recycling-facility/optical-sorter-arch` | 1,420 triangles; 2.82 × 2.89 × 7.03 m | Portal frame, hooded sensor head, lamps, belt, air knife, splitter, and bunkers are visible; finishes are plausible. | No material mismatch found. |
| `recycling-facility/overband-magnet-separator` | 3,536 triangles; 6.54 × 3.88 × 7.60 m | Suspended magnet and self-cleaning cross-belt sit above the feed conveyor, with a discharge chute and scrap skip; magnet paint, gantry, belting, and scrap remain distinct. | No material mismatch found. |
| `recycling-facility/glass-washer-trommel` | 3,122 triangles; 8.45 × 3.00 × 2.33 m | Inclined drum, riding tyres, trunnions, spray header, sump, and feed/discharge chutes are visible; stainless, frame paint, pipework, and wet cullet look coherent. | No material mismatch found. |
| `recycling-facility/granulator` | 1,478 triangles; 1.83 × 1.92 × 2.75 m | Open hopper exposes the rotor and knives; flywheel drive, rubber belts, and regrind bin distinguish the machine from its plastic output. | No material mismatch found. |

The [review bundle](../../artifacts/catalog-demos/recycling-facility-five-preview-semantic-review-20261112/README.md) contains the five branch source/render pairs, captured live source/render baseline, exact hash and target ledgers, PR status, render comparison sheet, and an inspected MP4 audit walkthrough. Because no defect was established, there is no before/after render or asset regression test. This visual review does not certify vendor dimensions, machine performance, safety, deployment, or physical acceptance.
