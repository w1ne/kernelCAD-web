# Shipyard preview review and contact-pad material correction

Date: 18 November 2026

Scope: five existing shipyard previews; one material mapping corrected.

## Finding and change

The spreader beam source described four end shoes as soft-contact, but assigned
all four the same yard-paint control as the beam and drop links. Each shoe now
uses a separate editable `elastomer` color parameter. Both existing presets
include pad colors. The generated preview shows the dark pads against the
painted frame. Geometry, dimensions, and the 380-triangle mesh did not change.

The test first failed against the baseline GLB at `contact-shoe-0`, then passed
after the material mapping changed. The regression reads the exported GLB,
checks the colors on all four named shoes, checks the three material controls
and preset values, and asserts the triangle count remains within budget.

## Five-preview ledger

See [preview-review.md](preview-review.md) for the five reviewed assets, their
local source/preview hashes, indexed envelopes and triangle counts, and public
page/source/preview status captured before the edit. Baseline public material
is retained under `live-baseline/`; pre-edit source and preview copies are in
`before/`. The other four reviewed source files and previews are retained in
`samples/`.

Two separate observations were recorded without changing those assets:

- `plate-pack-transfer-cart`: the push bar appears detached from the frame.
- `weld-consumable-issue-cage`: mesh infill is missing despite the description.

The pipe-rack and shipfitter-cabinet previews read as their named objects.
Open-target scans and their result are in `check_open_targets.py` and
`verification/open-target-check.json`. The scan covered all six open PRs, all
eight open issues, and tracked fixes #1298/#1305/#1307/#1308; it found no
overlap. PR #1258 was merged with all 17 reported CI checks successful before
the audit began.

## Reproduce

From the repository root:

```bash
npx tsx scripts/renderCatalogPreviews.ts hull-block-spreader-beam
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/hullBlockSpreaderContactPadMaterial.test.ts
python3 scripts/checkCatalogQuality.py --kit shipyard
python3 artifacts/catalog-demos/shipyard-hull-block-spreader-beam-elastomer-pad-material-review-20261118/make_demo.py
```

`make_demo.sh` runs the retained Python demo source. Exact video settings are
in `demo-settings.json`; `verification/frames/` retains every slide source.
The [24-second MP4](shipyard-hull-block-spreader-beam-material-review.mp4) is
1280×720 H.264 at 12 fps.

## Evidence and limits

- `verification/index-build.txt` records a successful full catalog index rebuild.
- `samples/index-rows.json` records the five regenerated catalog rows.
- The full suite passed: 150 files and 220 tests, including the all-assets
  export and committed-index freshness check. The focused GLB regression passed
  1/1; ESLint passed.
- Quality-gate outputs, test logs, video probe/hash, decoded-frame contact
  sheet and [video review](verification/video-review.md) are in `verification/`.
- The auxiliary `render inspect` command timed out attaching to both existing
  Chrome sessions after websocket connection; [the attempt record](verification/render-inspect-attempts.md)
  documents this. No second browser was launched. The actual catalog-rendered
  PNGs were visually inspected and are retained in the bundle.
- The shipyard quality gate reports 70/70 passing. The repository-wide gate
  reports 2,398/2,402 passing (99.83%); four existing failures are in
  `standard-components`.
- This is a local source, catalog preview, and exported-GLB regression review.
  The change is not deployed and does not establish simulation results, rated
  lifting capacity, lifting-safety acceptance, or hardware acceptance.

The private dated comparable-workflow note is retained separately in
`kernelCAD-private/catalog-shipyard-20261118/`.
