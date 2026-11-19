# Air-compressor pump-fin material review — 19 November 2026

**Demo:** [15-second local MP4](review-demo.mp4) · [five-preview ledger](preview-review.md) · [before/after preview](before/air-compressor.png) → [updated preview](after/air-compressor.png)

This review corrected one material assignment in the existing
`industrial-plant/air-compressor` scene asset. Its twelve fin parts now use the
existing `pumpIron` color control, matching the pump barrels and heads. Geometry,
the 4,594-triangle count, 1.0 × 0.896 × 0.372 m software envelope, parameters,
presets, triangle budget and asset identity are unchanged.

## Five previews and target checks

The five selected source and preview snapshots are under [`samples/`](samples/).
All five live detail/source/preview routes returned HTTP 200 and matched the
local baseline hashes before editing. The exact open-issue and open-PR search,
including the current catalog PR diff and known fixes #1298, #1305, #1307 and
#1308, found no selected target overlap. See
[`verification/open-target-check.json`](verification/open-target-check.json)
and [`live-baseline/public-check.json`](live-baseline/public-check.json).

The preview ledger records the object silhouette, dimensions and material
observations for all five samples. The target before/after image shows the pump
ribs changing from receiver blue to the cast-iron finish while the receiver,
motor, guard and skid retain their distinct colors.

## Verification

- The focused exported-GLB regression failed against the baseline source for
  the expected fin palette mismatch and passed after the correction (1/1). It
  checks all twelve fin nodes, the pump barrels and heads, palette membership,
  parameters, presets, triangle count and envelope.
- Industrial-plant ESLint is clean.
- `npx vitest run tests/integration/catalog/` passed **158 files / 228 tests**,
  including full source/export/index freshness.
- Re-rendered all 60 industrial-plant previews; **19 preview PNGs changed**.
  The regenerated catalog index remains at **2,402 assets / 50 kits**. Only the
  air-compressor index row changed, its source SHA matches the source, and its
  preview path exists. See [`verification/index-row-check.json`](verification/index-row-check.json).
- The material/preset scan passes industrial-plant at **60/60 (100%)**. The
  global scan reports **2,398/2,402 (99.83%)**; the four unchanged assets below
  that gate are in `standard-components`.

Commands, outputs, PR status, index evidence, current public baseline, and
preview refresh paths are retained in [`verification/`](verification/).

## Demo source and inspection

Recreate the video with [`make_demo.py`](make_demo.py). Canvas, duration, codec
and provenance are recorded in [`demo-settings.json`](demo-settings.json); the
invocation is in [`verification/commands.txt`](verification/commands.txt).
The MP4 shows the five real catalog previews, the target before/after render,
the material controls and completed local checks. Extracted frames and visual
inspection notes are in [`video-review/`](video-review/).

The public docs and handoff describe native kernelCAD asset behavior only. The
dated official material comparison is recorded privately in
`kernelCAD-private`. This branch has not been deployed; local preview and GLB
checks do not establish vendor design, pump performance, process simulation or
hardware acceptance.
