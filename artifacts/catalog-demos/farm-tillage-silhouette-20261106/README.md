# Farm-machinery tillage silhouette refinement — 2026-11-06

**Demo:** [24-second before/after and variant walkthrough](farm-tillage-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

The quality gate already passed all 60 farm-machinery assets, but three soil-preparation implements still used only axis-aligned `box()` stacks and read as a comb of straight bars in their previews (192, 204 and 192 triangles). This follow-up rebuilt them from bent side-profile source geometry (`path()` outlines extruded across the frame, plus `cylinder()` wheels, discs and pins). It adds no kit or asset IDs and does not count these edits as promotions from thin assets.

## Results

- **Chisel plow:** pull-type two-rank tube frame with staggered C-shaped spring shanks that sweep back and curl forward to the point, coil spring cushions and caps at every clamp, centre transport wheels in fork plates, an A-frame tongue with hitch clevis and parking jack. Shank count 7/9/11; points straight, twisted (alternating left/right) or V-sweep. Default render **2,076 / 3,000** triangles (11 shanks with sweeps 2,456).
- **Subsoiler implement:** three-point-mounted heavy toolbar with twin mast plates, braces, top-link and lower-link pins; deep shanks clamped behind the bar in a parabolic or straight-leaning shape, each with a wear-steel shin guard and point, optional wings; a rolling coulter disc on a forward arm ahead of each shank; depth gauge wheels with adjusting screws at both ends. Shank count 3/5/7. Default render **1,808 / 2,600** triangles (7 shanks 2,272).
- **Rear landscape rake:** three-point headstock with triangular mast plates, link pins and centre beam to a swivel turntable; the rake bar, end plates and curved spring-steel tine comb turn together through 0/15/30°. Working width 1,500/1,800/2,100 mm sets the tine count; gauge wheels are optional. Default render **1,580 / 2,600** triangles (2,100 mm at 15° 1,756).
- Each source now has four material-named colour controls (previously two: painted steel and exposed steel): **+6 colour controls** across the three assets. The existing `weathered` and `highVisibility` presets were extended to cover every new material. **+7 shape choices** (shank count, point style, shank shape, point wings, working width, rake angle, gauge wheels).
- Triangle budgets were raised from 2,200 to 3,000 (chisel plow) and 2,600 (subsoiler, rake) because the bent shanks and wheels need it. Every option combination in the table above was exported at an uncapped budget and stays under the new ceiling, so the preview is not decimated.
- The quality gate result is in [quality-global-output.txt](quality-global-output.txt) and [quality-kit-output.txt](quality-kit-output.txt). ESLint, index build and catalog integration suite outputs are in the files beside this README.

[before/](before/) keeps the original source and preview bytes. [variants/](variants/) holds default, shape-choice, weathered and highVisibility renders from the same source ([variant-renders.json](variant-renders.json) records values, triangle counts and source hashes).

## Reproduce

From the repository root:

    npx tsx scripts/renderCatalogPreviews.ts chisel-plow subsoiler-implement rear-landscape-rake
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/farm-tillage-silhouette-20261106/render_farm_tillage_variants.ts
    python3 artifacts/catalog-demos/farm-tillage-silhouette-20261106/capture_farm_tillage_demo.py
    python3 scripts/checkCatalogQuality.py --kit farm-machinery
    npx eslint catalog/kits/farm-machinery/
    npx vitest run tests/integration/catalog/

Dated comparable product-form research is kept private. The branch is not deployed. These are stylized scene props; no tillage depth, draft load, hitch category fit or field performance is claimed.

## Untracked generated outputs

`frames/` is not tracked in git; it is regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/farm-tillage-silhouette-20261106/capture_farm_tillage_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
