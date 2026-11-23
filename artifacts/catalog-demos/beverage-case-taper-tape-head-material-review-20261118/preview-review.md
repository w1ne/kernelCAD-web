# Five-preview audit ledger — 18 November 2026

## Selection and overlap check

PR #1258 was checked first: it is merged, its recorded CI checks succeeded, and it has no submitted review. The current branch PR #1507 was checked at exact head `524eff9df1408bbf34ed34cd4f8339622bad54e2`; its `build-and-checks`, `changed-tests`, and `lint` checks passed, with no submitted review. Its changed catalog sources do not include these five IDs. Open issue and open PR title/body searches for all five IDs returned no matches.

The sample is a beverage-line manufacturing group. Four IDs had no earlier audit record in the checked catalog demo ledgers; `case-taper` closes the explicitly recorded, unresolved tape-head material candidate from the 14 November ledger.

## Rendered-preview review

| Asset | Envelope X × Z(up) × Y (m) | Triangles / budget | Visual review |
|---|---:|---:|---|
| `beverage-bottling-line/case-taper` | 1.18 × 0.97 × 0.76 | 176 / 2,200 | Reads as a carton-taping gantry with split belts, an upper head, and tan tape roll. **Selected material mismatch:** the head uses `foodPolymer` because its name contains “tape”; the separate roll already uses `packingTape`. The solid base and absent carton are recorded geometry limits, not changed here. |
| `beverage-bottling-line/bottle-date-coder` | 0.655 × 0.83 × 0.34 | 140 / 2,200 | Screen, print arm/head, photoeye, and pedestal read as a date coder. The source description mentions a moving-bottle guide, but none is modeled; recorded, not changed. |
| `beverage-bottling-line/cap-torque-head` | 0.3775 × 0.785 × 0.32 | 216 / 2,200 | The drive housing, spindle, chuck and distinct grip ring read as a capping head. No selected mismatch. |
| `beverage-bottling-line/vision-inspection-arch` | 1.7 × 0.965 × 0.6 | 216 / 2,200 | Portal, camera blocks, backlight and interrupted conveyor read as a bottle inspection station. No selected mismatch. |
| `beverage-bottling-line/neck-handling-air-conveyor` | 1.7 × 1.3 × 0.285 | 360 / 2,200 | Elevated guide track and support columns are visible. Bottles and air supply/plenum are absent, so it reads as a neck-guide rail more clearly than a complete air conveyor; recorded, not changed. |

All five checked-in previews were opened. The public case-taper detail page was opened in the already-running Chrome profile before editing; its baseline showed the teal head and tan tape roll. The live preview returned HTTP 200 with SHA-256 `e99741bbf416bf2374e11a210d7aea509d336d3e10597eaec78cca3af77f3d5a`; it matches the saved local pre-fix preview byte-for-byte. The live source hash (`b5db38f064c62eee7ea5c800f8e84346e599d6b367d399eb1f2553a6cee65c07`) also matches the pre-fix branch source.

## Correction intent

Assign only `case-taper/tape-head` to the existing metal color control. Keep the polypropylene `tape-roll`, geometry, dimensions, triangle budget, knobs, and presets unchanged. The engineering comparison and its inference boundary are retained privately; no competitor description is copied into the public handoff.

The focused exported-GLB regression was changed first and failed against the baseline source because the head still used `#3999a1`. It passes after the source correction and checks the head's metal palette color while retaining the tape roll's packing-tape color.
