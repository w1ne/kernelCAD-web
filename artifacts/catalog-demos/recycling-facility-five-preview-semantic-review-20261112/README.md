# Recycling-facility five-preview semantic review — 12 November 2026

## Review scope

Checked five machine previews in the `recycling-facility` catalog against their
labels, visible physical features, index dimensions, and material assignments:

- twin-shaft shredder
- optical sorter arch
- overband magnet separator
- glass washer trommel
- granulator

PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was open at
`47a6aefc88099de69ab30240fe42fa152796f711`, mergeable, and had all 17 reported
checks successful. No review had been submitted. Exact open-issue searches had
no matches. The exact source and preview paths did not occur in the public
diffs of the other 20 open PRs checked. PR #1258 is the active destination and
was excluded from the competing-target check.

## Finding

All five checked-in branch previews read as their labeled equipment. Their
visible color zones also correspond to plausible materials or finishes. No
material mismatch was established. There is no asset edit, before/after render,
or asset regression test in this round, and `catalog/index.json` was not rebuilt.

All five branch source hashes match their generated index rows. All five
previews are present and their triangle counts remain below their declared
budgets.

## Public-site baseline

The five current public preview and source URLs returned HTTP 200. Public and
branch hashes match for `twin-shaft-shredder` and
`overband-magnet-separator`. The public site still serves older source/render
pairs for the other three: the optical sorter is 208 triangles live vs 1,420 in
this branch, the glass washer trommel is 400 vs 3,122, and the granulator is 408
vs 1,478. Those differences are captured in `live-site-check.json` and
`live-baseline/`. This branch is not deployed.

## Review walkthrough

[View the 17-second MP4 review](recycling-facility-five-preview-semantic-review.mp4).
The video shows the five checked-in renders and the no-defect result. It depicts
local preview review only; it is not a simulation, deployment verification, or
hardware acceptance claim.

The video is reproducible from the retained script and settings:

```bash
python3 artifacts/catalog-demos/recycling-facility-five-preview-semantic-review-20261112/capture_audit_demo.py
```

## Retained evidence

- `sample/`: exact branch `.kcad.ts` sources and rendered previews reviewed.
- `sample-ledger.json`: local/index/public source and preview hashes, dimensions,
  triangle counts, and outcomes.
- `live-baseline/`, `live-site-check.json`: public source/render snapshots and
  hash comparison with the branch.
- `open-target-check.json`, `open-target-check-output.txt`: issue and other-PR
  duplicate-target checks.
- `pr-status.json`: PR #1258 state and check results at review time.
- `video-inputs/`, `demo-settings.json`, `capture_audit_demo.py`, and
  `video-capture-output.txt`: MP4 source, settings, and invocation output.
- `video-review/`: probed video metadata, extracted frames, and visual inspection
  notes.

This audit is visual catalog evidence only. It does not validate vendor-specific
dimensions, rated machine performance, process safety, deployment, or physical
acceptance.
