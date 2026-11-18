# Recycling facility semantic quality review — 18 November 2026

PR #1258, the current catalog feature PR named in the standing brief, is
merged; all reported CI checks were successful and no review was submitted.
The subsequent industrial preview review sampled five recycling-facility
assets after checking open issues and PRs for overlap. No open item targets the
selected IDs, and the current draft PR #1507 has no changes in this kit.

The full preview ledger is in the [glass-breaker review bundle](../../artifacts/catalog-demos/recycling-glass-breaker-flails-material-review-20261118/README.md).
Four samples had no selected material mismatch. In `glass-breaker-screen`, the
preview reads as a bottle breaker and screen line, but the hidden rotor exposed
a source-to-control inconsistency: its 16 flails were hard-coded charcoal
while the existing `wearSteel` control explicitly covered the rotor, flails
and screen mesh.

The flails now use `wearSteel`. Geometry, controls, presets, asset ID, triangle
budget and kit membership are unchanged. The 2,988-triangle GLB remains under
the 3,600-triangle budget. A new integration regression fails against the
retained baseline source and passes against the corrected exported GLB. It
checks all 16 node assignments and their exported default colors. The standard
preview has been rendered again; the isolated rotor before/after render makes
the material difference visible at review scale.

The generated catalog index records the source hash and updated palette. The
source hash matches the file on disk and the preview path exists. Kit ESLint
passed, and the full catalog integration suite passed **148/148 files and
218/218 tests**, including the full index freshness check. Exact command output
is retained in the review bundle.

The current public catalog route was checked before the branch change and
matched the pre-change source and preview. This branch is not deployed, so no
post-deploy claim is made. These are local preview and GLB material-mapping
checks; they do not establish process simulation or hardware acceptance.
