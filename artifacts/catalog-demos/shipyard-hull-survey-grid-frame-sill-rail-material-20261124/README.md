# Hull survey grid frame — sill-rail material review (24 November 2026)

## What changed

`catalog/kits/shipyard/hull-survey-grid-frame.kcad.ts` painted only `frame-rail-0` with
the yard finish. `frame-rail-1`, the mirrored sill rail of the second portal frame, was
left as bare structural steel, so the rendered pair showed one dark rail and one light
rail. Both sill rails now use `yardPaint`; the uprights, top rails and three
cross-reference bars stay `structuralSteel`.

The meta description claimed leveling feet and target mounts that the source does not
build. It now describes the two portal rectangles, the sill and top rails, the uprights
and the three cross-reference bars.

Geometry is untouched: 308 triangles against a 1,800 budget.

## Evidence

| File | Content |
|---|---|
| `preview-review.md` | Five-asset ledger, the choices and the deferred cases |
| `samples/source-change.patch` | The exact source diff |
| `samples/previews/before-hull-survey-grid-frame.png` | Render at the audit base commit |
| `samples/previews/after-hull-survey-grid-frame.png` | Render after the correction |
| `verification/vitest-after.txt` | New regression test passes |
| `verification/vitest-before-fails.txt` | Same test fails on the pre-fix source |
| `verification/eslint.txt` | ESLint on the kit and the new test |
| `verification/catalog-quality-shipyard.txt` | Shipyard quality gate, 70/70 |
| `verification/catalog-suite.txt` | Full catalog integration suite, 222 files / 374 tests |
| `video-review/frame-1.0.png`, `frame-4.5.png` | Frames read back from the encoded video |
| `review-demo.mp4` | 5.8 s, 1280x720, before, after and the test result |

## Reproduce

```bash
npx tsx scripts/renderCatalogPreviews.ts hull-survey-grid-frame
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/hullSurveyGridFrameMaterial.test.ts
python3 scripts/checkCatalogQuality.py --kit shipyard
npx eslint catalog/kits/shipyard/ tests/integration/catalog/hullSurveyGridFrameMaterial.test.ts
python3 artifacts/catalog-demos/shipyard-hull-survey-grid-frame-sill-rail-material-20261124/make_demo.py
```

## Claims

The previews are local software renders of the exported low-poly GLB at default
knobs. The video shows local sources, those renders and the GLB colour regression. It
makes no claim about simulation, deployment, load capacity, compliance or hardware
acceptance.
