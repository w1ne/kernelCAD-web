# Ship-lift cradle paired-rail material review — 17 November 2026

## Intent and scope

This is a material-mapping correction to the existing `shipyard/ship-lift-cradle` asset. The paired guide rails share one role and dimensions, so both should use the existing `yardPaint` control. Cross ties and guide rollers remain on `structuralSteel`; hull pads remain on `elastomer`. Geometry, scale, presets, and the triangle budget are unchanged.

PR #1258 was checked before sampling: it is merged with all 17 reported CI checks successful and no submitted review. Current catalog PR #1507 was open with its checks passing and no submitted review at selection time. The five selected asset IDs did not match any open issue text, open PR description, or open PR changed source/preview paths. The full result and status snapshot are in [`verification/open-target-check.json`](verification/open-target-check.json).

## Five-preview ledger

| Rendered asset | What the preview shows | Material review |
| --- | --- | --- |
| `shipyard/ship-lift-cradle` | Paired guide rails, three cross ties, four dark hull pads, and four end rollers read as a transfer cradle. | **Mismatch selected:** identical side rails used `yardPaint` and `structuralSteel`, producing a visible light/dark split. Both now use `yardPaint`. |
| `shipyard/shipyard-block-transporter` | Long SPMT deck, multiple axle lines, power pack, timber cribbing stacks, and hazard-yellow deck edges. | Deck paint, dark suspension/tires, and timber loads are distinct and plausible; unchanged. |
| `shipyard/plate-rolling-machine` | Three rolls between side housings, a partly curled plate, drive motor, and controls read as a plate roller. | Machine paint, polished rolls, dark plate, and yellow hydraulics separate their roles; unchanged. |
| `shipyard/weld-fit-up-table` | Thick fixture top, eight stops, four legs, and lower shelf read as a welding fixture table. | Yard-finish top and steel fixture stops/frame remain distinct; unchanged. |
| `shipyard/pipe-spool-rotator` | A pipe spool rests on two roller stands with drive housings and a pendant stand. | Green frames, orange polyurethane rollers, and gray pipe/machined metal are distinct; unchanged. |

The other four previews have no selected material change. Their source and preview snapshots are in [`samples/`](samples/). The ship-lift cradle before and after source/preview pairs are in [`before/`](before/) and [`after/`](after/).

## Finding and correction

The two `ship-lift-cradle` side rails are both 3,000 × 220 × 260 mm paired guide members. `side-rail-0` already used `yardPaint` (`#76847b`); `side-rail-1` used `structuralSteel` (`#b6c1c4`). The source now maps `side-rail-1` to `yardPaint`. Cross ties and rollers retain structural steel, and the four contact pads retain elastomer. This corrects the visible inconsistency in the matched pair without imposing a shipyard-wide paint rule.

The generated preview still reads as an open transfer cradle. Its silhouette, 3.00 × 0.78 × 1.83 m envelope, 396 triangles, two presets, and 1,800-triangle budget are unchanged. The public asset remains a generic native kernelCAD scene model; it does not claim a vendor-specific shiplift or a universal coating standard.

## Before and after

- [Before preview](before/ship-lift-cradle.png)
- [After preview](after/ship-lift-cradle.png)
- [Five-preview contact sheet](samples/five-preview-contact-sheet.png)
- [Source mapping card](source-mapping.png)
- [Rendered MP4 demo](shipyard-ship-lift-cradle-rail-material-review.mp4)
- [MP4 settings and invocations](demo-settings.json)
- [Decoded video frames and inspection](video-review/inspection.json) · [frame contact sheet](video-review/contact-sheet.png)

The MP4 shows the five reviewed previews, the baseline material split, the one source mapping correction, the regenerated preview, and local verification. Captions identify this as a local software preview and GLB test; it shows no simulation, deployment, or hardware acceptance.

## Verification

- The focused exported-GLB test failed on the baseline at `side-rail-1`'s material and passed after the source change. It checks the two matched rails, three cross ties, four guide rollers, four elastomer pads, the existing color controls and presets, the unchanged dimensions, and 396 triangles. Logs: [`baseline-test.txt`](verification/baseline-test.txt) and [`focused-test.txt`](verification/focused-test.txt).
- `npx eslint catalog/kits/shipyard/ tests/integration/catalog/shipLiftCradleRailMaterial.test.ts` is recorded in [`eslint.txt`](verification/eslint.txt).
- `npx tsx scripts/renderCatalogPreviews.ts ship-lift-cradle` regenerated only the named preview. `npx tsx scripts/buildAssetCatalog.ts` regenerated the catalog index; the checked-in row's source hash and preview path are verified in [`index-check.json`](verification/index-check.json).
- The four unchanged sample previews and the cradle before/after renders were opened and visually reviewed. The after model remains a recognisable transfer cradle; both rails now share the same yard finish while the cross ties, pads, and rollers remain visually separate.
- The canonical `kernelcad render inspect` command timed out attaching to the already-running Chrome CDP session; no duplicate browser was launched, and the existing Chrome session remained responsive. See [`render-inspect-status.md`](verification/render-inspect-status.md) and the command output in [`render-inspect.txt`](verification/render-inspect.txt).
- The existing public detail route returned HTTP 200 at selection time ([baseline record](verification/live-page-baseline.json)). This branch is not deployed, so no post-deployment public-page result is claimed.
- Official product context and comparable material/preview workflows were checked and recorded privately in `kernelCAD-private`, dated 2026-11-17. Those references support review only; the public artifact remains native kernelCAD content.

## Rebuild commands

```bash
npx vitest run tests/integration/catalog/shipLiftCradleRailMaterial.test.ts
npx eslint catalog/kits/shipyard/ tests/integration/catalog/shipLiftCradleRailMaterial.test.ts
npx tsx scripts/renderCatalogPreviews.ts ship-lift-cradle
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/shipyard-ship-lift-cradle-rail-material-review-20261117/make_review_assets.py
bash artifacts/catalog-demos/shipyard-ship-lift-cradle-rail-material-review-20261117/make_demo.sh
python3 artifacts/catalog-demos/shipyard-ship-lift-cradle-rail-material-review-20261117/inspect_video.py
```
