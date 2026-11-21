# Mining semantic review handoff · 2026-11-18

## Finding and correction

The formal five-preview audit found one material-role mismatch in
`mining/crusher-discharge-conveyor`. The 42 rollers in 14 troughing idler sets
and four return rollers used `drivePaint`, whose existing label is “Drive and
chute paint”; the adjacent idler frames used `frameSteel`. The corrected
source assigns all **46 rollers** to the existing `frameSteel` finish
(`#58646c`). The chute, gearbox, head hood and a belt cover remain on the
existing green `drivePaint` (`#2f6f4a`).

The fix changes material assignments only. It adds no assets, color controls or
presets and changes no geometry. The export stays at **3,456 triangles** with
the existing **4,200 triangle budget**. The generated catalog row now carries
the corrected source hash and the rendered preview path.

## Review ledger

- The five formal preview checks and their findings are in
  [`preview-review.md`](preview-review.md). The public routes and PNGs were
  checked before editing, and none of the selected assets overlapped an open
  issue or pull request at audit time.
- The focused comparison isolates the same impact idler set before and after:
  [before](focused/before-idler-set.png) · [after](focused/after-idler-set.png).
- The standard [catalog preview before](before/crusher-discharge-conveyor.png)
  and the regenerated
  [catalog preview after](../../../catalog/kits/mining/previews/crusher-discharge-conveyor.png)
  show the full conveyor. The default `cover=covered` configuration conceals
  most carry rollers: the two wide PNGs differ at 0.272% of pixels. The
  focused export view demonstrates the finish change; pixel comparison is in
  [`verification/preview-pixel-diff.json`](verification/preview-pixel-diff.json).
- The preliminary five-image farm-machinery scope check is recorded as
  excluded in the ledger; it is not counted as part of the formal five.

## Verification

The focused GLB regression and target ESLint pass. The complete catalog
integration suite passes **149 files / 219 tests**, including the full index
freshness test. The regenerated index source hashes match all **2,402** source
files, and the changed-preview gate reports a fresh render match.

The mining kit quality gate passes **50/50 (100%)**. The global quality gate
currently reports **2,398/2,402 (99.83%)**; its four thin assets are in
`standard-components`, outside this one-asset semantic fix. The counts and
command outputs are retained in [`verification/`](verification/), including
PR #1258's merge/check result and the PR #1507 target-path snapshot captured
before this correction was added.

The public catalog page
[`mining/crusher-discharge-conveyor`](https://kernelcad.com/catalog/mining/crusher-discharge-conveyor/)
and its public preview matched the pre-edit source and image during review.
No deployment was made, so the live page remains at that baseline.

## Demo bundle

The 20-second [MP4 review demo](demo/crusher-discharge-conveyor-idler-material-review.mp4)
shows the five-image audit, the default preview, the focused before/after
idler set, and the final verification results. Rebuild it with
[`demo/make_demo.sh`](demo/make_demo.sh); the Python source, FFmpeg settings,
slides and sampled-frame inspection report are kept in [`demo/`](demo/).
Invocation and frame settings are in [`demo/demo-settings.json`](demo/demo-settings.json).

The focused views use the catalog's exported GLB and the repository's CPU
software rasterizer. The existing Chrome/CDP session could not create a WebGL
context; its diagnostic evidence is retained in
[`verification/render-player-diagnostic.json`](verification/render-player-diagnostic.json).
No second browser was launched. The demo describes local source/export
validation only; it does not claim deployment, simulation, or hardware
acceptance.

## Source and tests

- Corrected source: [`crusher-discharge-conveyor.kcad.ts`](../../../catalog/kits/mining/crusher-discharge-conveyor.kcad.ts)
- Regression test: [`crusherDischargeConveyorIdlerMaterial.test.ts`](../../../tests/integration/catalog/crusherDischargeConveyorIdlerMaterial.test.ts)
- Source snapshot before the correction: [`sources/before/`](sources/before/)
- Source snapshot after the correction: [`sources/after/`](sources/after/)
- Formal preview ledger: [`preview-review.md`](preview-review.md)
