# Shipyard plate-roller conveyor material review — 18 November 2026

The five-preview ledger is in [`preview-review.md`](preview-review.md). The
selected mismatch was in `shipyard/plate-roller-conveyor`: two mirrored side
frames with matching dimensions used different finishes. Both now use the
existing `yardPaint` control. Structural steel remains on the rollers, guide
rails and feet. Geometry, dimensions, controls, presets and triangle count did
not change.

## Before and after

- [Before source, preview and index row](before/)
- [After source, preview and generated index row](after/)
- [Five reviewed sources and rendered previews](samples/)
- [Public page and preview baselines](live-baseline/public-check.json)
- [Baseline-failing and final-passing exported-GLB regression](verification/)

The targeted regression failed against the retained baseline because
`side-frame-1` did not use the shared yard finish. It passes after the one-part
reassignment and confirms representative rollers, guide rails and feet keep
their structural-steel color. The refreshed 440-triangle preview shows both
side frames in the same finish, under the 1,800-triangle budget. The generated
index source hash matches the source file and the preview path exists.

PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was checked first:
it is merged with all 17 reported checks successful and no submitted review.
At the time of this review, current catalog PR
[#1507](https://github.com/w1ne/kernelCAD-web/pull/1507) was open with no
submitted review. After pushing this commit, the draft PR did not receive an
automatic run, so full CI was dispatched against the exact pushed SHA. The
[run passed catalog-index freshness, changed-source preview validation,
build/typecheck, lint, and seven test shards](verification/ci-after-push.md),
but the overall workflow failed one test shard: `qualityRatchet.test.ts`
reported `src/modeling/capture/proxy.ts` over its 820-line limit. That file is
1,576 lines in this branch and 1,498 lines on current `develop`; it was not
changed by this catalog commit. The quality test and baseline are identical
between branch and `develop`. The failure does not implicate this asset fix.
Seven open issues, six open PRs, and the named fixes #1298, #1305, #1307 and
#1308 were checked for overlap; none targets these selected asset IDs or source
paths. The exact scan is retained in [`verification/`](verification/).

All five public detail pages and preview images returned HTTP 200. Their current
preview hashes still match the retained pre-edit local PNGs. This branch is not
deployed, so no post-deploy claim is made. The full catalog integration suite
was not rerun locally. The focused exported-GLB regression, shipyard ESLint,
shipyard quality gate and full catalog-index regeneration passed locally; CI's
catalog-index freshness and changed-source preview gates also passed. The full
CI result and failure excerpt are retained under [`verification/`](verification/).

## Demo

[Watch the 14.97-second MP4](shipyard-plate-roller-conveyor-side-frame-material-review.mp4).
Recreate it with [`make_demo.py`](make_demo.py); settings and source invocations
are in [`demo-settings.json`](demo-settings.json) and
[`verification/commands.txt`](verification/commands.txt). Decoded frames and
codec metadata are in [`video-review/`](video-review/). The clip shows the
five-preview audit, before/after result, part-color mapping and verification.

The official [Cochin Shipyard plate-preservation-line tender](https://cochinshipyard.in/uploads/TENDOR/d01953b339e2a4bc42f153c0d893354a.pdf)
describes steel profiles, fabricated steel conveyor frames and steel rollers.
That is material context only; the generic kernelCAD prop is not a
vendor-specific representation or manufacturing specification.

The demo shows local software previews and an exported-GLB color regression.
It does not show process simulation, deployed behavior, a load rating or
hardware acceptance.
