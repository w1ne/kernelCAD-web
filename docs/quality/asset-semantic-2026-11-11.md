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
