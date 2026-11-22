# Amusement park catalog wave

This bundle records 70 original CC0 scene assets for park entry and guest
services, family attractions and queues, midway games, concessions and rest
areas, and park operations. The kit adds one coherent guest precinct to the
branch catalogue: **2,240 indexed assets across 47 kits**, each with a rendered
PNG preview.

## Demo

[Watch the 19-second amusement-park walkthrough](amusement-park-demo.mp4). It
shows the generated catalog gallery, attraction-zone filtering, the observation
wheel's default and scale-1.25 meshes with measured bounds, a midway game, and a
concession cart. The MP4 is H.264, 1440×900, 24 fps, and 328 KB.

The demo is a local software preview. The branch is not deployed; it makes no
claim about live website behavior, hardware acceptance, ride safety, or
operational suitability. The gallery page itself is retained as
`amusement-park-demo.html`.

Capture source and evidence:

- `demo_capture_sequence.js`, `demo-capture-settings.json`, and
  `demo-capture-verification.json`
- `parameter-variant/amusement-park/park-observation-wheel.kcad.ts` and
  `park-observation-wheel-scale-1.25.png`
- `parameter-variant-audit-output.txt` and `parameter-variant-audit.json`

The screencast reused the existing Chrome/CDP session. The recorded workflow
shows 70 visible cards after resetting the filters and confirms the observation
wheel remains at 620 triangles and one material while its measured bounds grow
by exactly 1.25×.

## Sources and reproduction

`generate_amusement_park_assets.py` generates the 70 native `.kcad.ts` sources,
kit metadata, and README. Each asset uses millimetres and Z up, exposes overall
scale and color controls, uses one material, and declares an 1,800-triangle
ceiling. Floor-placed assets have a base origin at Z = 0. The sources and
previews are CC0 1.0.

Reproduce the generation, lint, index and preview workflow from the repository
root:

```sh
python3 artifacts/catalog-demos/amusement-park-wave-20261103/generate_amusement_park_assets.py
npx eslint catalog/ --fix
npx eslint catalog/
python3 artifacts/catalog-demos/amusement-park-wave-20261103/run_with_occt_cjs_compat.py --output catalog-build-output.txt -- npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/amusement-park-wave-20261103/render_amusement_park_previews.py
python3 artifacts/catalog-demos/amusement-park-wave-20261103/run_with_occt_cjs_compat.py --output catalog-build-after-previews-output.txt -- npx tsx scripts/buildAssetCatalog.ts
```

The final floor-origin corrections rerendered 16 affected PNGs, followed by a
final index rebuild. The complete integration suite and the 1.25 parameter mesh
check were then run with the same OCCT compatibility wrapper.

## Verification evidence

- `source-and-preview-audit.json`: 70/70 source hashes match the generated
  index; all assets expose scale and color, use one material, have a base
  minimum at Z = 0, and fit the 1,800-triangle limit (72–976 triangles). All 70
  preview paths resolve to PNG files. The complete index has 2,240 rows across
  47 kits and 2,240 preview-backed rows.
- `catalog-test-final-output.txt`: `npx vitest run tests/integration/catalog/`
  passed all 4 files and 15 tests.
- `catalog-pages-check.json` and `catalog-pages-build-output.txt`: all 70 local
  detail pages and preview copies were generated; the local hub lists the kit,
  and the sample page exposes both parameters.
- `parameter-variant-audit.json`: the generated scale-1.25 observation-wheel
  source builds a 620-triangle, one-material mesh within budget; each measured
  bound is 1.25× its indexed default.
- `npm-build-output.txt`: `npm run build` passed. It retains the existing
  vendored `verb-nurbs` warning about comparison with `NaN` using `==`.
- `npm-pack-dry-run.json`, `npm-pack-dry-run-stdout.txt`,
  `npm-pack-dry-run-stderr.txt`, and `npm-package-boundary-audit.json`: the
  `--dry-run --ignore-scripts` inventory has exactly 70 amusement-park sources
  and 70 previews. The package export map is unchanged; no commercial source or
  deployment workflow was added.
- `origin-corrected-preview-render-output.txt`,
  `catalog-build-after-origin-preview-output.txt`, and the full catalog logs
  retain the rerender and final index-build invocations.

## Website status and scope

The branch is not deployed. The latest recorded public baseline in the
existing Chrome session found 1,291 preview-backed assets across 31 kits and a
404 at `/catalog/`; no public amusement-park page is claimed. The local gallery
and generated static pages are review evidence, not deployed pages.

These are generic visualization props. The kit does not specify ride structure,
restraints, barriers, controls, accessibility compliance, food-equipment
ratings, or operating procedures. Catalog replay and software checks do not
establish attraction safety, code compliance, or physical acceptance.
