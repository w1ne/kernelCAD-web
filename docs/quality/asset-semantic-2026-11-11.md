# KernelCAD asset semantic review — 11 November 2026

## Scope and gates

- Reviewed the current status of [web PR #1258](https://github.com/w1ne/kernelCAD-web/pull/1258) before sampling. Its head was `73832bdf4ba648d698aec3eab2c83e3bc9738b1f`; all 18 reported checks were successful. No review had been submitted (`reviewDecision` was empty).
- Sampled five wind-energy turbine assets. Exact open-issue and open-PR searches for each asset ID returned no matches; none of their source paths is changed by this branch. This avoids the open industrial-plant wave (#1215), standard-component work (#1279, #1308, #1323), and open grinder issue (#1331).
- Opened the five rendered previews and compared their SHA-256 values with the live `kernelcad.com/assets/` PNGs. Each live preview matched its checked-in image byte for byte. The live `.kcad.ts` source hash also matched the local source and `catalog/index.json` `sourceSha256`.
- These are CC0 low-poly scene assets. The visual check does not certify manufacturing dimensions, fit, performance, or standards compliance.

## Preview ledger

| Asset | Rendered observation | Envelope (m) | Source SHA-256 | Preview SHA-256 | Result |
|---|---|---:|---|---|---|
| `wind-energy/turbine-rotor-hub` | Three radial blade bosses and bearing rings are visible on a shop cradle; casting, bearing steel, fasteners, cradle paint, and timber are visually distinct and plausible. | 0.828 × 1.006 × 0.810 | `921d9f2e30f229375cd65e7e151e6595403a23d3bb09bbb3a37e3493030ba694` | `5086c1f5b05aefd5c6288786781213f066ff790d47806a92bb78c668ce27a7f4` | No material or label mismatch found. |
| `wind-energy/turbine-nacelle-shell` | White composite housing has a shaft opening, ventilation louvres, roof cooler, warning lights, and a transport frame. Visible materials are plausible. | 1.344 × 0.796 × 0.520 | `5ab54055ddcecdd993544a1a4cb291bbbcfba74f63fde0488c5876caa97afd23` | `afa99662fd84e10aa2cc8491a98aca7f412f2ca02ce1b1c88ba8deb316d327fd` | No material or label mismatch found. |
| `wind-energy/horizontal-axis-wind-turbine` | Recognizable three-blade onshore turbine with tapered tower, nacelle, red warning tips, and concrete base. | 2.807 × 5.160 × 1.127 | `dc413efb593e14ab2baa1b4f1e32b7c34a6ace8c06b77412f7b70344c3c61396` | `e15b2d3ffd1159ee1f4c705a9b9c4d310cdfb45c2cabd503a6e88cfa96aacfb4` | No material or label mismatch found. |
| `wind-energy/rooftop-wind-turbine` | Compact three-blade rotor, nacelle, tripod mast, and roof plate read as a rooftop turbine assembly. Painted steel, composite blades, and stainless hub are plausible. | 0.791 × 1.352 × 0.520 | `d074bc91ac6963b0b67ed4044d3523ca0c52c074cc41f36304aba8778dc0bd95` | `96977b8e8d901108218232bb6b81ad87434a8a7288a0e62850d7d8b02327218a` | No material or label mismatch found. |
| `wind-energy/small-farm-wind-turbine` | Three-blade rotor, narrow tower, tail vane, nacelle, and ground base are recognizable. Painted steel and composite blade colors are plausible. | 1.086 × 2.018 × 0.296 | `1fb5046efe96808faecbd367641f1d2f34304f3e9ef3caf25f8a82a7995850ab` | `7f95dc684cd0b0dcc5b99384f97fff0e59c70c63b8590b9b7611dbca3f8a3dd7` | No material or label mismatch found. |

## Outcome

No valid material mismatch was found in this five-asset sample. No asset source, preview, test, or generated index was changed; no before/after render was produced. This records a visual semantic pass only, not engineering acceptance.

## Second sample — shipyard manufacturing assets

- Rechecked PR #1258 before sampling. Baseline head `d9169b05845b7f8ab8e07d47fd1c0c8bcb914d7c` had all 18 reported CI and DCO checks successful, with no submitted review or inline review thread.
- Checked five shipyard manufacturing assets against open issue title/body searches, open PR title/body searches, and exact open PR changed-source paths. No matches were found; the result is retained in the handoff bundle's `open-target-check-output.json`.
- Opened all five rendered previews. Four were semantically plausible and had coherent material zoning. `hull-panel-turnover-cradle` showed its two same-sized end frames in different finishes: `yardPaint` on one and `structuralSteel` on the other. Both are matching fabricated frame members, so the mixed treatment read as a material assignment error.
- Changed only the second frame's material assignment to `yardPaint`. The axle, saddle arms, panel stops, and stabilizing feet remain `structuralSteel`. The GLB regression checks both exported frame colors, both existing presets, the 420-triangle count, and the 2.18 × 1.76 × 1.76 m envelope.
- The local preview was re-rendered and `catalog/index.json` regenerated. Its source hash now matches the edited `.kcad.ts`. The local generated detail page includes the updated preview, both material controls, and both presets.
- The live preview route still serves the original image (`4b6931370c89f2f05df1f6397cbb7e142b6cf952e087b7cb0da515c9d90fddec`). The live detail page and `/catalog/` returned HTTP 404; the updated local page is not deployed.

| Asset | Rendered observation | Envelope (m) | Source SHA-256 | Preview SHA-256 | Result |
|---|---|---:|---|---|---|
| `shipyard/plate-rolling-machine` | Three bright rolls, side housings, drive and a curled plate read as a plate roller; blue machine paint and steel rolls are distinct. | 6.18 × 2.015644 × 3.061673 | `9a6e9f3f430e311241585a1181022fb180e0fa73c9beef83e9c9d554ccf3d6de` | `38c0ec11072992f939a47a5a362f5a3fd3b865e1f94571c54da81b57ffe6b1cb` | No mismatch found. |
| `shipyard/plasma-cutting-gantry-head` | Orange bridge and carriages span a dark slat table; the down-facing torch, extraction riser and console are visible. | 8.257 × 2.05 × 5.478 | `6908bf4c7ebabf079b961ef38b51fe107a61f4566453cd738004600432608835` | `606a5f803535b46324dc1f5a0b5b9199b2eca87bebde89b6e0cc7e98d8b12044` | No mismatch found. |
| `shipyard/pipe-spool-rotator` | Steel pipe rests across two painted stands and orange paired rollers; the drive motor and pendant are visible. | 5.229 × 1.957076 × 2.38 | `070a2922dba06e147942effd7342b488341201110b6329e0fb5e6ba6fed6a7c5` | `8b2b7c4dba38fe3000bfc00d42d4273d60fd86649487ee1aa6ea8411b831c0d6` | No mismatch found. |
| `shipyard/hull-panel-cutting-table` | Slatted cutting bed, end rails and side tray read as a rectilinear shipyard table; yard and structural finishes are coherent. | 2.66 × 1.065 × 1.95 | `e1a8df969f477ee0986873de9ed004327b64511bb312f9fc3a1f6e94093ac5a8` | `b4c43e239b43823428c7d517493faf741179f235ddb302e0f0c6501a30791162` | No mismatch found. |
| `shipyard/hull-panel-turnover-cradle` | Before: matching end frames used two finishes. After: both end frames use yard paint; the axle, arms, stops and feet remain structural steel. | 2.18 × 1.76 × 1.76 | `330ceb2e5badccfc2fcaa40bb3a597d0016de44c1f7057e4a3ee7a5979ba6457` | `6f4c8664a9668676724a0a99892f1eb907dfe028ba9f605d17ca4422a8713648` | Material mismatch corrected; no geometry change. |

The complete before/after preview, source, regression, index evidence, validation
logs, local page check, and inspected MP4 are linked from the [shipyard kit
handoff](../../artifacts/catalog-demos/shipyard-hull-panel-turnover-cradle-material-review-20261111/README.md).
The dated product-context comparison is stored privately in
`kernelCAD-private/docs/competitors/2026-11-11-shipyard-turnover-cradle-material-review.md`.

This is a local visual and material-assignment correction. It does not verify
turnover capacity, structural strength, safe operation, vendor dimensions,
deployment, or physical acceptance.

## Third sample — mining equipment

- Rechecked PR #1258 before sampling at head `d47f29eac7cfe46d75f48020c7ad886683cf273f`: all 18 reported checks succeeded and no review had been submitted.
- Checked `ball-mill`, `mine-locomotive`, `mine-skip`, `sag-mill`, and `tailings-filter-press`. Exact open-issue and open-PR searches returned no matches, and none of the 20 currently open PRs changes a `catalog/kits/mining/` source. The already-audited `underground-shuttle-car` and `rock-breaker-boom` were excluded.
- Four previews showed coherent machine silhouettes and plausible material zoning. In `mine-skip`, the steel rope cappel was grouped with the yellow warning stripe, guide rollers, and landing keps. It now uses the existing `structuralSteel` control. The regression checks the exported cappel color, existing presets, 1,490-triangle count, and 5.2 × 16 × 5.4 m envelope.
- Re-rendered the `mine-skip` preview and regenerated `catalog/index.json` from the source. The checked-in image and index describe the local 1,490-triangle model.
- `npx eslint catalog/kits/mining/ tests/integration/catalog/mineSkipCappelMaterials.test.ts` is clean. `npx vitest run tests/integration/catalog/` passed all 24 files and 39 tests, including the all-catalog index freshness check.
- The live `assets.json` snapshot reports the older `mine-skip` at 172 triangles; its PNG is a box-like legacy preview. The asset-library route loads, while `/asset-library/mining/mine-skip/` returns 404. The local correction is not deployed.

| Asset | Rendered observation | Envelope (m) | Source SHA-256 | Preview SHA-256 | Result |
|---|---|---:|---|---|---|
| `mining/ball-mill` | Long cylindrical grinding shell, trunnion supports, drive train, feed and discharge equipment read as a mill; coating, steel and concrete are distinct. | 15.054532 × 6.828922 × 9.000000 | `a7533658535acef38bbd93e1c73c77c7fbef0cc6c69714e7236d674bd5e290af` | `6a13f3209c9bb34299230b6d524aca0e454e0b0fbc134312279bac438bf5e253` | No mismatch found. |
| `mining/mine-locomotive` | Low locomotive reads on its narrow-gauge rails; body coating, frame steel, rubber and lamp glass are distinct. | 8.400000 × 3.700000 × 2.480000 | `469d9bf10f652afde393cb82d1fd31cdaf5b2dccb66763cd5082ef19324a2c90` | `ec79f939270e520e5728e219e5521c8c6d298abf96fb0ccb023759e3881fc76f` | No mismatch found. |
| `mining/mine-skip` | Open-topped skip, bridle, guide shoes and rope connection read as a shaft conveyance. Before: cappel used warning yellow. After: cappel uses structural steel; no geometry change. | 5.200000 × 16.000000 × 5.400000 | `82bed1f18f1d4948687ac7e418e499f8f51b77954a5e204394616897138d028d` | `c2e17680a2c7a4de726c2632613eec0b474f143160feeef13f2170b76e35da95` | Material assignment corrected; see [mine-skip handoff](../../artifacts/catalog-demos/mining-mine-skip-cappel-material-review-20261111/README.md). |
| `mining/sag-mill` | Large grinding drum with feed opening, drive and support piers reads as a SAG mill; shell coating, drive steel and concrete are coherent. | 17.055211 × 10.090000 × 12.023301 | `efd8df99e197a36aae39c4b543cefc8165ed7f9ac9d7151bf78b482b4279b259` | `9e7711fb9f0c165fe576f12a05858576396532879bbc8a3452eab1d7d8dff236` | No mismatch found. |
| `mining/tailings-filter-press` | Plate pack, end frames, access platform, discharge area and safety railings read as a filter press; machine paint, steel, concrete and safety markings are distinct. | 18.020000 × 7.460000 × 10.600000 | `fda14597914dbee8c78cca72b0ba23766b0cb11d80a034a00097304144f625c5` | `669e00a7de6edab1d27b23b85f242cdaed5f746fb1def2a1107c921d8714ad50` | No mismatch found. |

The [mine-skip handoff bundle](../../artifacts/catalog-demos/mining-mine-skip-cappel-material-review-20261111/README.md)
contains before/after previews, the inspected MP4, source and render settings,
open-target checks, regression output, and index evidence. This is local visual
and material-assignment evidence only; it does not establish skip capacity,
structural strength, safe operation, deployment, or hardware acceptance.

## Fourth sample — beverage packaging material assignment

- Rechecked PR #1258 before sampling at head `da8dad80d47526d03557b959405797c7f5e43d0a`: all 18 reported checks succeeded and no review had been submitted.
- Reviewed five beverage-line previews: `pet-blow-molder`, `rotary-filler`, `bottle-rinser-carousel`, `case-layer-palletizer`, and `bottle-unscrambler`. Exact open issue/PR title and body searches returned no matches. An open-PR file-path query also returned no matches. At audit start, the branch diff changed only `cap-elevator` among these five assets.
- Checked the live asset image and `.kcad.ts` source before editing; both matched their checked-in counterparts byte for byte.
- Four samples showed plausible material zones. `case-layer-palletizer` assigned its outfeed `pallet-deck` to `corrugatedBoard`, despite having no corrugated layer pad. The pallet deck now uses `palletTimber`, with a distinctly darker wood palette. Geometry, 132-triangle count, 2.39 × 2.025 × 1.1875 m envelope, and preset names are unchanged.
- Re-rendered only the target preview and rebuilt `catalog/index.json`; the generated diff changes only the palletizer row, and the row's `sourceSha256` matches its source.

| Asset | Rendered observation | Envelope (m) | Baseline source SHA-256 | Baseline preview SHA-256 | Result |
|---|---|---:|---|---|---|
| `beverage-bottling-line/pet-blow-molder` | Guarded machine enclosure, side module, service doors, base and mold-column supports are visible; no clear material mismatch found. | 1.515 × 1.510 × 0.720 | `b9ce94ad7b3b5358740fc62dd43c0897771d6096513b1a87f2763153d6481deb` | `d6f5019c87ce4b80e9e781befbbd453866da78bea38969192d533c613d6813a8` | No material mismatch found. |
| `beverage-bottling-line/rotary-filler` | Carousel, ring bowl, valves over bottles, infeed/outfeed belts and guard frame are visible; material zones are plausible. | 3.000 × 1.840 × 1.49668 | `05e6214ab84cc8e9cf18fa95ec05b9f24ca857d4064b872fe5e4e1fe72c8c1af` | `153302383773399caf0a1553ae14e08058d1b82b6a7a084d0031c21a8b51e8d0` | No material mismatch found. |
| `beverage-bottling-line/bottle-rinser-carousel` | Rotary table, rinse turret, spray nozzles, catch basin and two lanes are visible; no clear material mismatch found. | 1.420 × 1.050 × 0.960 | `dc00c4af37bea6206eb023d88cd963867559388fa327a92fba44082cb7fe26e5` | `5eb1b35219f05a1afced551ed9825ffe9a088b969e55cfea830d64af23edb810` | No material mismatch found. |
| `beverage-bottling-line/case-layer-palletizer` | Gantry and layer plate are recognizable. Before: the outfeed pallet deck used the corrugated-board control; after: timber control. | 2.390 × 2.025 × 1.1875 | `24d6e63d5f67fc6d5ae0f2f231bcfc9e39a2eb879d32a54bb12c7ed5c3d85b4b` | `fce331bee93a711dbdf2878ba482436a7fd26ed44b04be2c87146807c2e866ad` | Corrected to `palletTimber`; after source SHA-256 `f7040c36ccab96af3997f0dee2e7be6480ed6f2a44706aee3c41d99b672ffafd`, preview SHA-256 `fbc36f859a6b468803604680e8e219b2f3f991e048c447e161c80e7c034b3734`. |
| `beverage-bottling-line/bottle-unscrambler` | Circular bowl, center column, motor and discharge lane read as an unscrambler; material zones are plausible. | 1.255 × 0.850 × 0.940 | `d38fdb9af117adf2779eba2e14b993a7f955494e04216f66d8277245a77028f4` | `a4dd4876e3f3b1b98203a06d7599cc70d9ec75bd7e64583fafd64888e87597c5` | No material mismatch found. |

- The GLB regression checks the exported pallet color, existing presets, 132-triangle count, and envelope. Beverage-line lint is clean; focused test passes 1/1. The full catalog integration result is recorded in the handoff bundle.
- The handoff contains before/after previews, an inspected eight-second MP4, render settings/source invocation, sample hashes, PR/open-target status, generated index rows, and verification logs: [case-layer-palletizer material review](../../artifacts/catalog-demos/beverage-case-layer-palletizer-material-review-20261111/README.md).
- The dated product-context comparison is stored privately at `kernelCAD-private/docs/competitors/2026-11-11-case-layer-palletizer-pallet-material.md`.

This is a local source, material-control, and preview correction; it is not deployed. The outfeed deck remains a simplified solid slab. No pallet capacity, strength, safety, or physical acceptance is verified.

## Fifth sample — water-treatment equipment semantic review

- Rechecked open PR #1258 before sampling: it was open, had no submitted review, and its reported CI/DCO checks were successful. Open-issue title/body searches for all five sample IDs returned no matches. The paginated open-PR API file-path audit hit GitHub's API rate limit, so I listed the 18 current open PRs from GitHub's public page and inspected each public `.diff`; no exact sampled source or preview path matched. #1258 surfaced in three text searches, but its changed water-treatment paths were `backwash-pump-skid`, `pressure-sand-filter-vessel`, `reverse-osmosis-skid`, and `vertical-turbine-pump`, none sampled. The rate-limit response and completed fallback results are documented in the handoff bundle.
- Opened all five checked-in previews. Four showed recognizable equipment with plausible colors/material zones: `lamella-clarifier`, `belt-filter-press`, `rapid-sand-filter`, and `uv-disinfection-channel`. `grit-classifier` was labeled as a classifier but showed a level trough, hopper, and cylinder with no extraction screw. This was a missing defining physical feature; no material-color mismatch was found in this five-asset sample.
- Compared the classifier with an official WAM/SAVECO product reference privately; the catalog asset remains explicitly illustrative and is not vendor-dimensioned. The reference emphasizes a decanting tank, extraction screw, and hopper. The private dated comparison is at `kernelCAD-private/docs/competitors/2026-11-11-water-treatment-grit-classifier-semantic-review.md`.
- Rebuilt `grit-classifier` as an open settling trough with a visible inclined helical flight and shaft, raised discharge chute, coaxial drive, hopper, and four support legs. Kept the three existing material controls, both presets, and 2,200-triangle budget. The GLB regression checks material grouping, screw mesh existence, mesh extent, and triangle budget. The target preview renders at 1,132 triangles.
- Rendered the checked-in preview after the final source edit, then regenerated `catalog/index.json`. Its updated row records source SHA-256 `dfbaf808ef9ff40f9d6b0a46246e43d25d756f931f2e091a2be087a8922a88b9`, preview `/assets/water-treatment-grit-classifier.png`, 1,132 triangles, and a 0.912452 × 0.67 × 0.36 m envelope.
- `npx eslint catalog/kits/water-treatment/ tests/integration/catalog/gritClassifierFidelity.test.ts` passed. The focused regression passed 1/1, and `npx vitest run tests/integration/catalog/` passed all 26 files and 41 tests, including the all-asset source/index freshness check.
- The local before/after previews, source copies, render settings, MP4, checks, and logs are in [the grit-classifier handoff bundle](../../artifacts/catalog-demos/water-treatment-grit-classifier-semantic-review-20261111/README.md). The official product comparison is private. The local correction is not deployed.

| Asset | Rendered observation | Baseline source SHA-256 | Baseline preview SHA-256 | Result |
|---|---|---|---|---|
| `water-treatment/lamella-clarifier` | Settling tank, angled plate pack, access structure, and legs read as a clarifier; colors are coherent. | `96b74661ca9590eff670aa921fc560f2a47ae58234c1df0b9171455d10621619` | `53af77aa80a82c767866023a6eeb662f64072c9288abe5278ff37f29d00ddefa` | No mismatch found. |
| `water-treatment/belt-filter-press` | Long belt press, roller train, access platform, and discharge are visible; material zones are plausible. | `8af4a81f2accb3252d7be178f5066d7adbc70571ef7051fb322ddd1c103b7954` | `8732459ff2dcc9f34a46d96e5ea9dcbf223ccc2ec588d5bb1d96b57f5b1ef9e9` | No mismatch found. |
| `water-treatment/grit-classifier` | Before: level trough, hopper, and cylinder without an extraction screw. After: open trough, inclined helical extraction screw, raised chute, and drive. | `a96dec6ee15e0a1a9c34d1fcb7fee1390caed58717817475eae5b14377499a5a` | `4b35371646184f2bbaa457ad3cb0d617ca80c14b3f40b175ac0cc4cc14bf920b` | Missing defining feature corrected; no material mismatch found. After source `dfbaf808ef9ff40f9d6b0a46246e43d25d756f931f2e091a2be087a8922a88b9`; after preview `bf83818b992481cf034cd0bd80bd9b29794104a036030db9c54aac35342efcdc`. |
| `water-treatment/rapid-sand-filter` | Vessel, support structure, access details, and filter-bed zone read as a sand filter; colors are plausible. | `718fc049977aa5ec4494e9e98f7c25810f3e34dc19c605b8d42ea8047bf5666b` | `dd95c6afee920baac3385b2a88cbdbcf63b99a017e89e2292aa806e2e9fc0fde` | No mismatch found. |
| `water-treatment/uv-disinfection-channel` | Channel, access platform, lamps, and pipework are recognizable; stainless and channel colors are coherent. | `aa3676d7a0a4a0ba39e689a0bcf63a49bb5ea699effa9e7f99d30cae33c4d056` | `3602374b4c2eb23d4ddc9a8abfda6923cb6bf4117874bf8551a3cee4a395e543` | No mismatch found. |

This is a semantic feature correction from a local preview audit. It does not verify process performance, vendor dimensions, equipment safety, deployment, or physical acceptance. No material mismatch was found in this five-item sample; the correction addresses the classifier's absent extraction screw.

## Sixth sample — construction equipment

- Rechecked PR #1258 at baseline head `d6f9b782a637789a9d1a58f9ffa4cab0967f7b49`: it was open with no submitted review. Its latest report had 16 successful check runs and `external-tools` cancelled. Exact open issue and PR searches returned no matches for the five selected IDs; file lists for all 18 open PRs contained none of their source or preview paths.
- Opened all five local rendered previews: `backhoe-loader`, `crawler-dozer`, `motor-grader`, `skid-steer-loader`, and `transit-mixer-truck`. The first four have recognizable silhouettes and plausible dimensions/material zones. In the transit mixer, the six steel wheel rims used the bright yellow equipment-enamel control even though the rubber tires, cab and drum bands already have separate controls.
- Liebherr's official HTM 804 product page and Generation 05 mixer brochure show the same material distinction: dark tire rubber with metallic-gray wheel rims against the body finish. The dated comparison and captured reference are retained privately at `kernelCAD-private/docs/competitors/2026-11-11-transit-mixer-wheel-material.md`.
- Changed only the six rim assignments from `equipmentPaintColor` to the existing `structuralSteelColor`. The GLB regression checks all six exported rim colors, retained color controls and preset names, the 4,296-triangle count, and the 8.269668 × 3.6 × 2.72 m envelope. Geometry and catalog count are unchanged.
- Re-rendered the transit mixer and regenerated `catalog/index.json`; the row source hash matches the edited source and still points to its rendered preview. The public site remains on the pre-change preview because this branch has not been deployed.
- `npx eslint catalog/kits/construction-equipment/ tests/integration/catalog/transitMixerWheelMaterial.test.ts` completed cleanly. `npx vitest run tests/integration/catalog/` passed all 27 files and 42 tests, including the all-source index-freshness comparison (8m 55s). The local detail-page check confirmed its preview, material controls and both presets. Logs and generated index rows are in the [transit mixer handoff bundle](../../artifacts/catalog-demos/construction-transit-mixer-wheel-material-review-20261111/README.md), together with the inspected MP4, source and settings, five preview hashes, and before/after images.

| Asset | Rendered observation | Envelope (m) | Source SHA-256 | Preview SHA-256 | Result |
|---|---|---:|---|---|---|
| `construction-equipment/backhoe-loader` | Loader bucket, glazed cab, rear digging boom and stabilizers are visible; tires, enamel, glass and steel are distinct. | 7.93 × 3.95 × 3.3 | `4ba9d14b61fdaf1e23e0142de184d7dfb461910feccceaa7a775bb756570c26d` | `13d8b665d2ce0983b7d61658eeb0a07b48cabf4627b5590b346bf5e4c95d6599` | No mismatch found. |
| `construction-equipment/crawler-dozer` | Front blade, glazed cab, engine deck and crawler tracks are visible; painted panels, track steel and exposed structure are coherent. | 5.28 × 3.2 × 3.36 | `dd7e0d791543a35a91c86ba879fc7da117a3de535d2f694fd094b750a1311338` | `c155a24f806d72d4b0f56836e4e85bd0a0993670c6305e96ea7e65062d05fdae` | No mismatch found. |
| `construction-equipment/motor-grader` | Articulated frame, cab, tandem rear axles, steering axle and center moldboard read as a road grader; tire rubber, enamel and steel are distinct. | 9.31 × 3.52 × 3.427105 | `fbace1e66c0020b7917e8e39cb203256db4b09b487be56836bdcfbac6f926a73` | `eb4fd8b3ccabf4e39c8e017d568fc3d9c7bcb495caf94e46c3ca8a039e8217ae` | No mismatch found. |
| `construction-equipment/skid-steer-loader` | Compact loader, lift arms, bucket, protective cab and four tires read clearly; tire rubber, glazing, enamel and cutting edge are distinct. | 3.19 × 2.078651 × 1.9 | `d73aefdd58c00f2a89489c96d32c0d21f14b887429d23947509998deedce708c` | `5f296abcdbb25b0e36707f035039cd8241dda9dfff8365fdc79ce20593ad2b8e` | No mismatch found. |
| `construction-equipment/transit-mixer-truck` | Before: all six rims shared the yellow enamel control. After: rims use structural steel gray; black tires and yellow cab/drum bands remain distinct. | 8.269668 × 3.6 × 2.72 | Before source `49eacba7d31ce03c67ecb73e5595a2e829858bebb42c117104b5f233a290f937`; after source `f491239865e81de5af9a2e1ffb82c5cb068369bf619dc08c1e33cc1a1755c5e1` | Before `63619d76e04771efdf3ede330258deb7be3ae5a83654ee461ef691e7864e6ea5`; after `716154169343616e9ed2907d6cc692798f7a7bbc607055db1b4a85d9bc471095` | Material assignment corrected; no geometry change. |

This local preview and material-control correction does not verify mixer capacity, roadworthiness, manufacturer-specific fit, safety, deployment, or physical acceptance.
