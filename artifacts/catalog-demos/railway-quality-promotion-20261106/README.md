# Railway kit quality promotion

[Watch the 18-second source-to-preview walkthrough](railway-quality-promotion.mp4).

This round improves the existing 40 railway assets and adds no catalog IDs.
Every asset now has two to four material-named color controls plus
`weathered` and `freshService` presets. The 132 material controls replace 40
generic color knobs (net +92); the 40 preset blocks provide 80 named variants.
Distinct parts use painted steel and aluminum, glazing, rail steel, rubber,
timber, concrete, ballast, enamel, and safety finishes. The diesel and electric
locomotives have refined noses and glazed cabs, the crossing gate has visible
stripes, the station clock has hands and dial marks, and the milepost has a
contrasting distance marker. All models remain within their existing triangle
budgets.

## Results and evidence

- [Verification summary](verification.json) records the per-kit and catalog
  quality counts, lint and test results, preview review, and deployment limits.
- [Promotion audit](promotion-audit.json) maps every named part to its
  material controls, records all presets, and preserves each original color.
- [Preview render output](catalog-preview-render-output.txt) records 40
  regenerated PNGs. [The contact sheet](preview-contact-sheet.png) shows the
  complete railway kit; `before/` retains original diesel locomotive, steam
  locomotive, and station platform renders.
- [Catalog build output](catalog-build-output.txt) records the generated
  `catalog/index.json`; the local page check confirms 40 railway source hashes
  and preview paths match the index.
- The railway-only quality gate is **40/40**. The full catalog is
  **2,211/2,390 passing (92%)**, with 179 thin assets in four other kits.
  The full audit exits 1 because those other kits remain thin.
- [ESLint output](catalog-eslint-output.txt) is clean; the final
  [catalog integration run](catalog-test-output.txt) passes all four files and
  15 tests. The first integration attempt is also retained in
  [catalog-test-first-attempt-stale-index.txt]; it started during index
  regeneration and read stale hashes. The clean run followed the generated
  index refresh.
- [Local pages output](catalog-pages-build-output.txt) records the generated
  2,390-page catalog. [The railway page audit](catalog-pages-check.json)
  checks all 40 local pages, preview images, knobs, presets, and source hashes.
- [Preview review](preview-review.md) records the visual check of the diesel
  locomotive, crossing warning light, and station platform.
- `video-review/contact-sheet.png` contains decoded MP4 samples. The MP4 shows
  original and promoted renders, actual source parameters and geometry, and
  local verification. It is branch-local evidence: deployed behavior remains
  unverified and no hardware acceptance was performed.

## Rebuild and verify

The [current demo bundle](../../../artifacts/catalog-demos/railway-quality-promotion-20261106/README.md)
contains the exact commands, source promoter, rendered previews, test output,
and verification records for this round. Its source promoter expects the
original, unpromoted railway sources and refuses already-promoted input. The
full-catalog quality command exits 1 until the four other thin kits are
promoted.
