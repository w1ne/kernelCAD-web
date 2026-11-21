# Recycling facility five-preview audit — 18 November 2026

Reviewed five rendered machinery previews for semantic identity and material
roles. All five read as their named equipment and showed coherent visible
material zones. No material mismatch was established, so no asset, test,
preview, or catalog index row changed.

## Review ledger

See [preview-review.md](preview-review.md) for the per-asset observations and
preview hashes. The [contact sheet](contact-sheet.png) and
[short review video](review-demo.mp4) show the sampled previews and conclusion.

## Target and baseline checks

- PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) is merged and
  its reported CI checks passed.
- Current catalog PR
  [#1507](https://github.com/w1ne/kernelCAD-web/pull/1507) is open; its checks
  passed and no review had been submitted at the check time.
- No open issue or PR source path matched these five assets. The four known
  merged fixes #1298, #1305, #1307, and #1308 also have no matching source path.
  Details are in [open-target-check.json](open-target-check.json).
- The five public detail pages and preview files returned HTTP 200. Each live
  preview hash matched the checked-in rendered PNG; see
  [live-site-check.json](live-site-check.json).
- The checked-in `catalog/index.json` source hashes match all five source
  files. The relevant rows are retained in [index-rows.json](index-rows.json).

## Reproduction and evidence

The exact invocation and encoding settings are in
[demo-settings.json](demo-settings.json) and
[verification/commands.txt](verification/commands.txt). The render source is
[make_demo.py](make_demo.py); snapshots of the checked sources and previews are
in `sources/` and `previews/`. The public baseline preview copies are in
`live-baseline/previews/`. The video probe and visual review are in
`verification/`.

The video shows a local preview audit only. It does not claim simulation,
deployment, or hardware acceptance.
