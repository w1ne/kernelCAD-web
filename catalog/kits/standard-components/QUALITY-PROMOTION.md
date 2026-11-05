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
