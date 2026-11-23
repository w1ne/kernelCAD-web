# Industrial-plant pipe-rack crossbeam material review — 18 November 2026

The five-preview ledger is in [`preview-review.md`](preview-review.md). It
records five industrial asset checks and the one selected mismatch in
`industrial-plant/pipe-rack-bay`: two crossbeams and their mounting baseplates
used the safety-paint control while the matching support columns and braces
used structural steel. Those four frame parts now use the existing `steel`
control. The yellow center utility run and its flanges remain distinct.

## Before and after

- [Before preview and source](before/)
- [After preview and source](after/)
- [All five reviewed previews and sources](samples/)
- [Exported GLB color regression before and after](verification/)
- Generated catalog row: [before](before/index-row.json), [after](after/index-row.json),
  and [source hash/index verification](verification/index-row-check.json).

The focused GLB regression failed against the original source at
`crossbeam--1` and passed after the correction. ESLint passed for the full
industrial-plant kit and the new test. The regenerated preview shows the
structural frame in one steel finish, retains the yellow center line, and
remains at 360 triangles under the 1,400-triangle budget. The two-worker full
catalog run passed all 152 files and 222 tests, including the generated-index
freshness check. The default parallel run had one 300-second timeout in the
shape-handle check under load; that check passed in isolation and in the
two-worker run. Logs and the generated-index hash check are under
`verification/`.

PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was already merged;
its reported CI checks were successful and it had no submitted review. Open PR
[#1507](https://github.com/w1ne/kernelCAD-web/pull/1507) was checked at head
`bd26c457f` before selection: its reported non-skipped checks passed, it had no
submitted review, and its changed source paths did not include any of the five
reviewed assets. Exact issue/PR selection evidence is in
[`verification/open-target-check.json`](verification/open-target-check.json).

The public pipe-rack detail page and preview returned HTTP 200 before the edit;
the live preview SHA matched the checked-in baseline. This branch has not been
deployed, so the public page still shows the prior finish assignment. No
deployment or hardware acceptance is claimed.

## Demo

[Watch the 15-second MP4](review-demo.mp4). Recreate it with
[`make_demo.py`](make_demo.py); exact settings and commands are in
[`demo-settings.json`](demo-settings.json) and
[`verification/commands.txt`](verification/commands.txt). The clip shows the
five-preview review, the before/after software render, the four material
assignments, and the exported-GLB regression. It shows local kernelCAD source
and preview behavior only; it is not a physical simulation, deployed behavior,
or hardware acceptance.
The inspected frame sheet and video metadata are in
[`verification/video-review.md`](verification/video-review.md).

This is a generic native kernelCAD scene asset, not a vendor-specific model or
engineering specification. The dated official product/CAD workflow comparison
is retained privately in `kernelCAD-private`.
