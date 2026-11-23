# Five-preview industrial-plant review — 19 November 2026

## Selection checks

- PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was merged on
  14 November; its reported checks succeeded and it had no submitted review.
- Active catalog PR [#1507](https://github.com/w1ne/kernelCAD-web/pull/1507) was
  checked at head `0f0f994523a6f14fb1b64d6325a24214f7886266`. Its reported
  non-skipped CI checks succeeded and no review had been submitted. GitHub
  reported a `BLOCKED` merge state.
- Exact issue title/body and PR title/body/path checks found no overlap for
  these five IDs. The selected source and preview paths also do not overlap
  PR #1507 or the known fix paths in #1298, #1305, #1307, and #1308. The
  complete saved result is in
  [`verification/open-target-check.json`](verification/open-target-check.json).
- All five current public detail pages, source files and preview routes returned
  HTTP 200. Public source and preview SHA-256 hashes matched the local baseline
  for every selected asset. See [`live-baseline/public-check.json`](live-baseline/public-check.json).

## Five-preview ledger

| Asset | Baseline envelope (m) | Baseline tris | Preview observation and result |
|---|---:|---:|---|
| `industrial-plant/air-compressor` | 1.0 × 0.896 × 0.372 | 4,594 | Horizontal receiver, saddles, skid, motor, belt guard, two finned pump heads, gauge and controls read as a compressor package. The twelve pump cooling fins used receiver steel while their pump barrels and heads used cast iron. **Corrected:** fins now use the existing `pumpIron` control. |
| `industrial-plant/baghouse-dust-collector` | 0.9301 × 0.8632 × 0.439 | 552 | Enclosed plenum, tapered hopper, outlet, legs, walkway and fan read as a baghouse. Internal filter media is not exposed in this exterior view; the visible steel and safety-paint zones are coherent. No mismatch selected. |
| `industrial-plant/bucket-elevator` | 0.465 × 1.0836 × 0.39 | 780 | Tall casing, top and bottom housings, and exposed bucket run read as a compact bucket elevator. The `steel` and `safetyPaint` zones are distinct. No mismatch selected. |
| `industrial-plant/forklift-truck` | 3.11 × 2.35 × 1.14 | 3,388 | Counterweight, LPG bottle, operator guard, two-stage mast, carriage and fork tines read as a counterbalance truck. Body, steel, rubber and fittings controls stay distinct. No mismatch selected. |
| `industrial-plant/weigh-hopper` | 0.5616 × 0.5813 × 0.4752 | 236 | Hopper body, tapered discharge, outlet and four support legs read as a compact batch weigh hopper. The steel and safety-painted zones are distinct. No mismatch selected. |

The recorded dimensions are generated software envelopes, not verified vendor
dimensions. The sampled preview check does not establish equipment performance
or manufacturing acceptance.

## Selected correction

The pump barrels and heads already used `pumpIron`; the adjacent twelve cooling
fins used `receiverSteel`. They now use `pumpIron`. No geometry, dimensions,
triangle budget, parameters, presets, or asset identity changed. The default
render remains 4,594 triangles in the same 1.0 × 0.896 × 0.372 m envelope.

The before/after pair shows the pump-cylinder ribs changing from receiver blue
to the same dark cast-iron finish as the barrels and heads; the motor, belt
guard, receiver and skid remain visibly distinct.

## Verification

The new exported-GLB regression failed on the original source because the fins
were absent from the `pumpIron` palette, then passed after the remap. It checks
all twelve exported fin nodes against the cast-iron color, their palette
membership, both pump barrels and heads, parameter and preset names, triangle
count and envelope. See `verification/test-before.txt` and
`verification/test-focused-after.txt`.

The industrial-plant previews were re-rendered as a 60-asset kit pass; 19 PNGs
changed, including the target. The regenerated index has 2,402 assets across
50 kits, a fresh source hash and preview path, and only the target row changed.
The catalog integration suite passed 158 files / 228 tests. Industrial-plant
passes the material/preset scan at 60/60 (100%). The global scan reports
2,398/2,402 (99.83%); four unchanged `standard-components` assets remain below
that gate. Logs and row-level evidence are retained in `verification/`.

All five selected previews were inspected; air-compressor, baghouse and
forklift were reopened after the kit render. They remain recognizable and
colored, and the compressor ribs now share the dark cast-iron finish of their
barrels and heads.

The public source and preview hashes matched the local baseline before the
change. This branch has not been deployed; no public page update is claimed.

## Provenance and limits

The public handoff describes a generic native kernelCAD scene asset and its
material assignment. The branch-local preview and GLB checks do not prove a
vendor-specific design, pump performance, site deployment, process simulation,
or physical acceptance.
