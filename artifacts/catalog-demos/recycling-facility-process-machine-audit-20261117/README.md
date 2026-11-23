# Recycling facility process-machine preview audit — 17 November 2026

This bundle records a semantic review of ten existing `recycling-facility`
software-rendered previews. The first five were selected as process machinery
with no earlier entry in the semantic-review ledgers. After that group showed
no supported material error, five more previews were screened. No asset source
had a clear material mismatch supported by both the render and its named parts,
so no catalog source, test, preview, or index row was changed.

The checked-in preview snapshots, source snapshots, and per-asset observations
are in [preview-ledger.md](preview-ledger.md). The [target check](target-check.json)
records current open issue and pull request searches, the changed-file scan of
all open PRs, and PR #1258's merged status and successful checks.
Run [`verify_audit_bundle.py`](verify_audit_bundle.py) to rebuild
[`asset-integrity.json`](asset-integrity.json) from the current index and files.

All ten source hashes match their current `catalog/index.json` rows, and all ten
rows have preview paths present in the catalog kit. The recorded triangle counts
are below their declared budgets. Those checks establish index/source
consistency and structural limits; they do not establish vendor-specific design
or equipment performance.

The images show local catalog software renders only. No simulation, deployment,
or hardware acceptance is claimed. Since no source changed, the index was not
regenerated and no regression test was added.
