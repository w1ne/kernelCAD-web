# Reverse-osmosis skid operator-display material review

Date: 2026-11-16
Asset: `water-treatment/reverse-osmosis-skid`
Change: the control-cabinet `operator-display` moves from the `structuralSteel` ("Structural steel") control to a new `displayGlass` ("Operator display glass") control. The skid frame, rails, cross members and supports keep structural steel; the cabinet door keeps stainless steel.

## Review ledger

| Rendered preview | Result |
| --- | --- |
| `water-treatment/reverse-osmosis-skid` | Found the operator display rendered as a grey structural-steel plate; corrected (follow-up from 2026-11-15). |
| `water-treatment/chlorine-residual-analyzer` | Display is buried inside the cabinet; geometry follow-up. |
| `water-treatment/chemical-storage-tank` | All-coated-steel tank; plausible, ambiguous; not changed. |
| `shipyard/ultrasonic-test-cart` | Cable spool in case paint; carried-over follow-up. |
| `data-center-infrastructure/liquid-cooling-manifold` | Asymmetric polymer support and headers on the wrong axis; geometry fix needed first; follow-up. |

See [`preview-review.md`](preview-review.md) and [`preview-review-five-assets.png`](preview-review-five-assets.png) for the visual ledger and contact sheet. Baseline captures are under [`samples/`](samples/). Before/after images, cabinet detail crops, and source snapshots are under [`previews/`](previews/) and [`sources/`](sources/).

## Demo

[Watch the MP4 workflow and result](water-treatment-ro-operator-display-material-review.mp4). Source invocation and settings are in [`make_demo.sh`](make_demo.sh) and [`demo-settings.json`](demo-settings.json). Frame inspection evidence and `ffprobe` metadata are in [`video-review/`](video-review/).

The clip shows a local software preview and a source-level regression result. It does not show deployed behavior, physical equipment, or hardware acceptance.

## Verification

- Regression: `npx vitest run tests/integration/catalog/reverseOsmosisSkidMaterials.test.ts` — passed (1 test). The pre-fix failure is in [`verification/test-before.txt`](verification/test-before.txt).
- Full catalog integration suite: `npx vitest run tests/integration/catalog/` — passed, 105 files and 173 tests ([`verification/vitest-catalog.txt`](verification/vitest-catalog.txt)). The freshness test rebuilt every catalog source and confirmed the committed index.
- Lint: `npx eslint catalog/kits/water-treatment/ tests/integration/catalog/reverseOsmosisSkidMaterials.test.ts` — passed.
- Quality gate: `python3 scripts/checkCatalogQuality.py --kit water-treatment` — 50/50 pass.
- Preview: `npx tsx scripts/renderCatalogPreviews.ts reverse-osmosis-skid` — rendered at 2,660 triangles, within the 3,300 budget.
- Index: `npx tsx scripts/buildAssetCatalog.ts` — regenerated row in [`verification/index-row-after.json`](verification/index-row-after.json).

## Comparison notes

The engineering basis is general: packaged RO skid control panels carry an HMI touch screen behind glass or polycarbonate, which appears dark when idle. Public artifacts describe the generic kernelCAD model and make no vendor-specific fidelity claim.

This branch has not been deployed. No post-deployment verification is claimed.
