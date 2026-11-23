# Beverage carton-sealer tape-head material review — 18 November 2026

The five-preview ledger is in [`preview-review.md`](preview-review.md). The
selected material mismatch was in `beverage-bottling-line/carton-bottom-sealer`:
the generic `tape` name rule colored the reusable metal taping head as
food-grade polymer. The head now uses `stainlessSteel`; the tape roll stays on
`foodPolymer`. Geometry and the 176-triangle mesh are unchanged.

## Before and after

- [Before source, preview and index row](before/)
- [After source and preview](after/)
- [Five reviewed source snapshots and previews](samples/)
- [Public pre-edit baseline](live-baseline/public-check.json)
- [Focused exported-GLB regression and generated index checks](verification/)

The focused regression failed against the baseline source because the taping
head was absent from the stainless-steel palette, then passed after the
correction. The regenerated preview shows a steel-gray taping head with its
polymer roll unchanged. The generated index records the current source hash
and preview path. Beverage-kit ESLint passed; the full catalog integration
suite passed **153 files and 223 tests**, including the exact 2,402-asset
index freshness check. Logs and a concise summary are under `verification/`.

PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was checked first:
it is merged, all 17 reported checks succeeded, and no review was submitted.
Open PR [#1507](https://github.com/w1ne/kernelCAD-web/pull/1507) was open with
its reported non-skipped checks successful and no submitted review; none of
the five selected source paths overlaps its changes. No open issue names the
selected assets. The exact target scan is in
[`verification/open-target-check.json`](verification/open-target-check.json).

The [public detail page](live-baseline/public-check.json), source and preview
returned HTTP 200 before the local edit; the live source and preview matched
the local baseline byte-for-byte. This feature branch is not deployed, so the
public page still reflects the baseline. No post-deploy claim is made.

## Demo

[Watch the 15-second MP4](beverage-carton-bottom-sealer-tape-head-material-review.mp4).
Recreate it with [`make_demo.py`](make_demo.py); settings and exact invocations
are in [`demo-settings.json`](demo-settings.json) and
[`verification/commands.txt`](verification/commands.txt). The clip shows the
five-preview audit, before/after render, material assignments, exported-GLB
regression and verification scope. Decoded frames, contact sheet and codec
metadata are retained in [`video-review/`](video-review/).

The video shows local software previews and GLB material checks only. It does
not show process simulation, deployed behavior or hardware acceptance. The
dated official equipment-material comparison is recorded privately in
`kernelCAD-private`; this generic asset is not a
vendor-specific copy or manufacturing specification.
