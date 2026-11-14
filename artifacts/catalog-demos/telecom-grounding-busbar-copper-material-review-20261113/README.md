# Telecom grounding busbar — copper material review (2026-11-13)

**Conclusion.** `telecom-infrastructure/grounding-bar` rendered its conductor bar as galvanized
steel. The bar is now copper and the six terminal studs are stainless steel.

**Evidence.**
- `before/` and `after/`: source and preview. `before-after.png`: side by side.
- `sample/five-preview-sample.png` and `preview-ledger.md`: the five previews checked.
- `verification/`: preview render, index build and index verification, ESLint (empty log = clean), focused test, test failing on the old source, full `tests/integration/catalog/` run (54 files / 87 tests passed).

**Change.** `rail` uses `copper` (`#c27836`). Terminals use a new `stainlessSteel` control
(`#d2dbdc`, same default as the kit's other stainless parts). The unused `galvanizedSteel`
control was removed; both presets set `stainlessSteel`. Geometry unchanged: 300 triangles.

**Limits.** This is an authored catalog colour correction. It does not establish a vendor
design, bar cross-section, tin plating, hole pattern or TIA-607 compliance.
