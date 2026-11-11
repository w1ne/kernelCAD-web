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
