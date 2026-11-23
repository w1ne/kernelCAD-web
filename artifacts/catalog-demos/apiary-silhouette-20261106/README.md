# Apiary PPE, smoker and hive tool silhouette rebuild — 2026-11-06

**Demo:** [before/after, orthographic check and variant walkthrough](apiary-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 50 apiary assets already passed the quality gate. The kit was still almost entirely `box()` geometry, though: 0.4 curved or rotated calls per asset, the lowest of any kit. Five assets did not read as their object from the preview:

- **beekeeper veil hood:** a square brim and a box crown over four flat mesh slabs;
- **beekeeper jacket:** a box torso, two box sleeves and a short cylinder;
- **beekeeper gloves:** two boxes on top of eight finger slabs;
- **bee smoker:** an oversized octagonal can (520 mm tall) with two boxes for bellows;
- **hive tool:** a T-shaped post, where the real tool is a flat bar.

This round rebuilt those five from lofted rings, limb lofts, tori and profiled extrusions. No kit or asset IDs were added, and these edits are not counted as promotions from thin assets.

## Results

- **Beekeeper veil hood** (on a display stand): a wide round brim, domed crown and hat band over a dark mesh veil that widens away from the face. The veil is held out by two wire hoops and drawn in by an elastic neck skirt. Shape choice: `style` `round-hat | fencing`. Fencing is a fabric hood with a round mesh face window and hoop.
- **Beekeeper jacket** (on a display stand): a loose lofted body with an elastic waistband, full-length front zip and two flapped hip pockets. It has raglan sleeves with elastic cuffs and an attached veil. Shape choice: `veil` `fencing | round`.
- **Beekeeper gloves** (pair, palm-down): thin goatskin hands with four tapered, fanned fingers and angled thumbs, and elastic wrists. Elbow-length canvas gauntlets flare towards an elastic top. Shape choice: `vent` `vented | plain` (mesh ventilation band).
- **Bee smoker:** now roughly real size, with a 100 mm can about 300 mm tall. It has a stainless fire can on a foot ring, a conical lid with a hinge, and a bent two-stage nozzle. A wire heat-shield cage (two rings, nine bars) covers the open sides. The bellows are a fixed inner board and a hinged outer board joined by pleated leather, with an air tube into the can. Shape choice: `heatShield` `cage | none`.
- **Hive tool:** now a real-size, roughly 245 mm flat steel bar. It has a bevelled scraper blade with a nail-puller slot cut through it. Shape choices: `style` `j-hook | standard` (J-hook frame lifter or short bent lip) and `grip` `painted | rubber` (painted band or ribbed oval sleeve).
- **Colour controls:** the gloves, smoker and hive tool keep their existing knobs and add one each: gloves `mesh` and `elastic`, smoker `guard`, hive tool `paint`. The veil hood and jacket replace `leather` with `trim`, because neither garment has leather parts; the knob drives the hat band, hoops, elastic and zip. They also add `stand`. Each asset has four colour knobs, except the hive tool, which has three. The existing preset names are kept, and the presets set every knob.
- **Shape choices:** +6 in total (one each, two on the hive tool).
- **Triangles** (default / variant): veil hood 2,368 / 1,172 (budget 1,800 → 2,600, because the hoops are tori); jacket 1,528 / 1,636 (1,800 → 2,000); gloves 1,232 / 1,160 (1,800 kept); smoker 1,644 / 576 (1,800 → 2,000); hive tool 172 / 192 (1,800 → 800). Measured values are in [variant-render-output.txt](variant-render-output.txt) and [variant-renders.json](variant-renders.json).
- **Scale change:** the smoker and hive tool are now drawn at real size rather than about three times oversized. Scenes that placed them will see them shrink.
- **Gate note:** the first version applied colour through a single `add(name, shape, finish)` helper. `checkCatalogQuality.py` counts `.color(<knob>)` call sites, so it saw one colour and failed all five. Each call now applies `.color(<knob>)` itself, so the source states each part's material directly. The renders are unchanged.
- **Ground contact:** the first glove build failed the integration test's `minUp = 0` check by 0.96 mm, because the tilted vent band and elastic top dipped below the ground. Those two rings are now horizontal, and every rebuilt asset's lowest vertex is at z = 0 (within 4e-14 mm).
- **Gates:** [kit](quality-kit-output.txt) 50/50 and [global](quality-global-output.txt) 2390/2390. [ESLint](eslint-output.txt) is clean, the [index build](catalog-build-output.txt) succeeded and [catalog integration](catalog-integration-output.txt) passed 15/15.

[before/](before/) keeps the original sources and preview bytes. [variants/](variants/) holds the default, shape-choice and preset renders. [views/](views/) holds front, side, top and rear three-quarter check renders. All of them are made from the same sources.

## Reproduce

From the repository root:

    npx tsx scripts/renderCatalogPreviews.ts beekeeper-veil-hood beekeeper-jacket beekeeper-gloves bee-smoker hive-tool
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/apiary-silhouette-20261106/render_apiary_variants.ts
    npx tsx artifacts/catalog-demos/apiary-silhouette-20261106/render_apiary_variants.ts --views
    python3 artifacts/catalog-demos/apiary-silhouette-20261106/capture_apiary_demo.py
    python3 scripts/checkCatalogQuality.py --kit apiary
    npx eslint catalog/kits/apiary/
    npx vitest run tests/integration/catalog/

The branch is not deployed. These are stylized scene props. They are not protective-equipment specifications or beekeeping guidance.

## Untracked generated outputs

`frames/` is not tracked in git; it is regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/apiary-silhouette-20261106/capture_apiary_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
