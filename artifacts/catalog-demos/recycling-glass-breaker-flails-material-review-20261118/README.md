# Glass breaker flail material review — 18 November 2026

This round audited five recycling-facility previews and corrected one material
mapping in `glass-breaker-screen`. The 16 chain-flail parts now use the existing
editable `wearSteel` material control, matching the rotor shaft, rotor discs and
screen mesh. The change adds no assets, controls or presets and preserves the
2,988-triangle model under its 3,600-triangle budget.

## Review bundle

- [Five-preview audit ledger](preview-review.md)
- [Five-preview contact sheet](preview-review-five-assets.png)
- [Full before and after previews](previews/before/glass-breaker-screen.png) and [after](previews/after/glass-breaker-screen.png)
- [Isolated rotor before and after](previews/rotor-detail/before-former-dark-flails.png) and [after](previews/rotor-detail/after-editable-wear-steel.png)
- Before/after source snapshots and the four other reviewed sources are in `sources/`.
- [Regression test](../../../tests/integration/catalog/glassBreakerFlailsMaterial.test.ts)
- [MP4 review demo](recycling-glass-breaker-flails-material-review.mp4)
- [Demo settings](demo-settings.json), [generation invocation](make_demo.sh), and [review asset source](make_review_assets.py)
- [Reproducible exported-GLB rotor comparison source](render_flail_detail.ts) and [invocation/result](verification/flail-detail-render.txt)
- [Video frame inspection](video-review/inspection.md)
- Verification logs and the regenerated index row are in `verification/`.

The test checks the named flail parts in the exported GLB, their wear-steel
palette membership and vertex colors, all four material controls, the four
existing presets, and the unchanged triangle budget. The before source fails
the flail assignment assertion; the corrected source passes. The kit ESLint
command is clean, and the full catalog integration suite passed **148/148
files and 218/218 tests**, including the full index freshness check.

All imagery is local preview evidence. The page check recorded the existing
public baseline before this branch change. The branch has not been deployed;
this work makes no claim about deployed behavior, process simulation or
hardware acceptance.
