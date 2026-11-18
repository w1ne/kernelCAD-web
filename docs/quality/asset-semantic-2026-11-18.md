# Semantic asset review — 2026-11-18

The mining preview audit found a material-role mismatch in the crusher
discharge conveyor: 46 troughing and return idler roller shells used the
drive-and-chute paint colour even though the adjacent idler supports use the
frame-steel finish. The source now assigns those roller shells to the existing
frame-steel control. The geometry, triangle count, public parameters and
presets are unchanged.

The focused GLB regression checks all 46 roller colours and representative
painted equipment parts. The review ledger, preview captures and verification
evidence are linked from the
[crusher conveyor handoff bundle](../../artifacts/catalog-demos/mining-crusher-discharge-conveyor-idler-material-review-20261118/README.md).

The public catalog page was checked during review. This source change has not
been deployed; the live page therefore still reflects the published baseline.

## Recycling-facility follow-up: no confirmed mismatch

After checking PR #1258 (merged, reported CI checks passed) and current catalog
PR #1507 (open, checks passed, no review submitted), five different
recycling-facility machinery previews were reviewed: `green-waste-shredder`,
`plastic-film-compactor`, `plastic-flake-silo`, `recovered-plastic-bagger`, and
`product-pelletizer`. Their silhouettes read as the named equipment and the
visible material zones were coherent. The rendered physical features and
catalog mesh envelopes were also checked; no material, scale, or label
mismatch was established.

No open issue or PR source path matched these assets. The known merged fixes
#1298, #1305, #1307, and #1308 also do not touch these source files. All five
public detail pages and previews returned HTTP 200, and the public preview
hashes matched the checked-in PNGs. The [five-preview ledger and inspected
video](../../artifacts/catalog-demos/recycling-facility-five-preview-audit-20261118/README.md)
retain the source snapshots, public baseline, exact target audit, index rows,
render settings, and verification evidence.

No asset, test, preview, or generated index row changed. This was a local
software-preview review and a public-baseline check; it does not claim
simulation, deployment of a change, or hardware acceptance.
