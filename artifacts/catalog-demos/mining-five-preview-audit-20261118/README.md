# Mining five-preview semantic audit — 18 November 2026

Reviewed five previously unaudited mining equipment previews for recognizability,
visible physical features, material-role consistency, and the catalog mesh envelope.
All five read as their named machines and no material mismatch was established.
No catalog source, test, rendered preview, or index row changed.

## Review ledger

See [preview-review.md](preview-review.md) for the per-asset observations,
dimensions, material checks, and preview SHA-256 values. The [contact sheet](contact-sheet.png)
and [short review video](mining-five-preview-audit.mp4) show the sampled local
previews and conclusion.

## Target and baseline checks

- PR [#1258](https://github.com/w1ne/kernelCAD-web/pull/1258) was merged on
  14 November; its CI checks were green.
- PR [#1507](https://github.com/w1ne/kernelCAD-web/pull/1507) was open during
  this audit. No reviewed asset path or exact slug matched an open issue or PR.
  See [open-target-check.json](verification/open-target-check.json).
- `catalog/index.json` source hashes match all five checked-in source files;
  the preview and index rows are retained under `verification/`.
- The audit uses local rendered previews. It does not claim simulation,
  deployment, or hardware acceptance.

## Reproduction and evidence

The preview/source snapshots are in `samples/`. Re-run the target check with
`python3 artifacts/catalog-demos/mining-five-preview-audit-20261118/check_open_targets.py`
and rebuild the video with
`python3 artifacts/catalog-demos/mining-five-preview-audit-20261118/make_demo.py`.
Inputs and encoding settings are in [demo-settings.json](demo-settings.json);
commands, hash checks, and video inspection evidence are under `verification/`
and `video-review/`.
