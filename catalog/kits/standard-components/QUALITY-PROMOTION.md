# Standard Components quality promotion — 2026-11-05

All 50 existing `standard-components` assets were promoted in place. No IDs or
kits were added. Every asset now has 2–3 material-named color controls, the
`dark`, `brass`, and `weathered` palettes, and a descriptive geometry comment.
The material controls total 110 (60 more than the previous one-per-asset
setup). Fifty `weathered` palette entries were added; all 150 per-asset preset
entries are recorded in the catalog index.

Specific geometry refinements add fastener heads to the flat joining plate, a
visible pin to the piano hinge, a grooved aluminum profile and locating ribs to
the T-slot cap, an isolation liner to the tubular spacer, and a groove and
rubber seat to the tube clamp. The flat joining plate budget was raised to 620
triangles for its 572-triangle result; other adjusted budgets remain above their
measured counts without unnecessary increases.

## Results

- Kit quality gate: **50/50 assets pass**.
- Catalog quality gate: **1,854/2,390 pass (77.6%)**, with 536 thin assets
  remaining (22.4%) across 11 other kits.
- Previews: all 50 kit previews were rendered; all 50 are present in the index.
- `catalog/index.json`: regenerated from the final sources; all 50 indexed source
  SHA-256 hashes match the files on disk.
- ESLint: clean for `catalog/kits/standard-components/`.
- Integration suite: 4 test files and 15 tests passed after the final index build.
- Static catalog pages: 2,390 pages plus the hub regenerated; all 10 focused
  page checks passed.

The first integration run overlapped the long index rebuild and caught the old
`piano-hinge` hash. That superseded run is retained in the evidence directory;
the full suite was rerun successfully after the new index completed.

## Review and demo

The [15-second MP4 workflow demo](demo/workflow.mp4) shows the local source,
material zones, rendered previews, and handoff. Its exact source, captions,
featured parameter defaults, 50 preview IDs, and replay invocation are in
[`demo/`](demo/). Three extracted video frames and a per-asset source/preview
hash manifest are retained with the [verification evidence](../../../artifacts/catalog-demos/standard-components-quality-promotion-20261105/).

Three regenerated previews were visually checked: the caster reads as a fork
and wheel, the handwheel shows its rim, spokes, and hub, and the T-slot cap shows
the grooved profile and orange polymer insert. The selected demo frames were
also inspected and retained. A separate four-view CLI inspection attempt timed
out while attaching to the already-running Chrome CDP session; the failure is
logged in the evidence directory.

Comparable workflows in Autodesk Fusion and Onshape were reviewed, with a dated
comparison note kept in `kernelCAD-private`. Public docs and examples describe
native kernelCAD behavior. Local catalog pages were generated and checked; the
follow-up has not been deployed, and no physical hardware acceptance was
performed. PR #1224 was already merged before this follow-up; the update is
recorded on that PR for review context.

## Linear-guide carriage detail follow-up — 2026-11-06

The [linear-guide-carriage source](linear-guide-carriage.kcad.ts) now presents
the mechanical details that were hidden from its catalog angle: an open
underside rail channel, paired polymer end wipers, four top mounting wells, and
a raised brass grease fitting. Its controls name steel, engineering polymer,
and brass. The existing compact / standard / large size choice remains, and the
existing `dark`, `brass`, and `weathered` presets now set all three material
zones. This changes one existing asset and adds no ID or kit.

- Material controls: **2 → 3** (steel, polymer, brass; one net new control).
- Presets: **3 retained and updated, 0 added**.
- Mesh: **408 triangles / 460 budget**.
- Quality gate: **50/50 kit assets (100%)** and **2,390/2,390 catalog assets
  (100%; 0 thin assets)**. The catalog pass rate was already 100% before this
  detail follow-up and remains 100%.
- Previews and index: all **50** standard-components previews were rerendered;
  the generated index was rebuilt, and the carriage source hash and preview
  path match the row.
- Local static site: 2,390 asset pages and the catalog hub were generated; the
  carriage page, controls, presets, preview and hub link pass **9/9** checks.
- ESLint passed. Catalog integration passed **4 files / 15 tests**.
- The [15-second source-to-preview demo and evidence bundle](../../../artifacts/catalog-demos/standard-components-carriage-quality-20261106/README.md)
  includes actual size and preset renders, before/after previews, invocation
  settings, check output and inspected MP4 frames.

Three final kit previews were inspected: the carriage reads as a guide block
with a dark open channel and brass fitting; the jaw coupling shows two steel
hubs around its orange polymer spider; the caster shows its fork and black
wheel. The branch is not deployed, so live-page behavior and physical hardware
acceptance are not claimed.

## Pulley, hinge and terminal-block visual follow-up — 2026-11-06

The [visible-details handoff](../../../artifacts/catalog-demos/standard-components-visible-details-20261106/README.md)
records a source-led review of three defaults whose previews still read as
primitives: the timing pulley was a plain flanged cylinder, the butt hinge had
horizontal leaves without alternating knuckles, and the terminal block was an
undetailed housing cube.

- Updated three existing assets; no kit or ID was added.
- Added one visible material control to each asset: flange hardware on the
  pulley, fasteners on the hinge, and copper contacts on the terminal block.
  Existing `dark`, `brass`, and `weathered` presets now vary all three zones;
  no new preset names were introduced.
- The pulley now has a 20-tooth radial crown, keyed bore, bolted retaining
  flanges and three material controls (1,236 triangles / 1,380 budget). The
  hinge has upright perforated leaves, five alternating knuckles, a brass pin
  and twelve visible fasteners (1,440 / 1,600). The terminal block has two
  copper cages visible from both sides, slotted clamp screws and an undercut
  steel clip foot (444 / 500).
- All 50 kit previews were regenerated and the catalog index was rebuilt from
  source. The kit and full catalog remain **50/50** and **2,390/2,390 passing
  (100%)** under `checkCatalogQuality.py`; the asset count did not change.
- Local catalog pages, lint and catalog integration were verified. The branch
  was not deployed; no vendor-standard, manufacturing or physical acceptance
  is claimed.
