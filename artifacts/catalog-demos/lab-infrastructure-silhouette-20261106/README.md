# Lab infrastructure: ULT freezer, extraction snorkel, safety shower, faucet set and dewar rack rebuild (2026-11-06)

**Demo:** [before/after, orthographic check and variant walkthrough](lab-infrastructure-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 60 lab-infrastructure assets already passed the quality gate on colour knobs and presets, but 58 of them had no `path`/`loft`/`revolve`/`extrudePolygon` call. Five did not read as the object, and three were visibly broken:

- **ultra-low-temperature freezer:** two door slabs floating 0.7 m above the cabinet top;
- **articulated extraction snorkel:** arm in two disconnected pieces, the hood floating in the air;
- **laboratory safety shower:** a bare pole with an orange stick and two pedestals;
- **laboratory faucet set:** a straight horizontal spout, no gooseneck, box handles;
- **cryogenic dewar storage rack:** three plain cylinders on a slab.

This round rebuilt those five from revolved profiles, extruded side and front profiles and oriented polygon rods. No kit or asset IDs were added.

## Results

- **ULT freezer:** 870 x 880 mm, 1.99 m tall. Rounded insulated cabinet, single thick outer door on a rubber gasket with two hinges, tall lever latch with lock barrel, sloped control cowl with touchscreen and status lamp, louvred compressor grille, side access port with plug, steel base frame. Shape choice `mount` `casters | feet`.
- **Extraction snorkel:** about 0.85 m tall with 1.2 m reach. Flanged bench mount, stem with damper and lever, swivel collar, two arm tubes with clamp collars joined by friction knuckles with red tension knobs, clear flared bell hood with rim oriented along the lower arm. Shape choice `pose` `reaching | folded` (same arm lengths, different joint angles).
- **Safety shower:** about 2.3 m tall. Safety-yellow column on a floor flange, top elbow and arm to a stainless drench head with diffuser, ball valve with lever, hanging pull rod with triangle handle, green first-aid sign. Waist-height bowl eyewash on its own tee with drain return, twin spray heads with dust caps and a push flag. Shape choice `eyewash` `bowl | none`.
- **Faucet set:** about 410 mm across, 400 mm tall. Bench flange, riser, horizontal cross body with two valve bodies and bonnets, high half-torus gooseneck (revolved tube sector) ending in a serrated hose-barb nozzle, hot and cold index buttons. Shape choice `handles` `wrist-blade | four-arm`.
- **Dewar rack:** 1.84 m wide, 0.9 m tall. Three 35 L class dewars (turned body with rounded shoulder, neck tube, collar, foam neck plug, cap, carry handle, label band), each on a round roller base with three casters and held by a yellow restraint hoop with arm and quick-release latch on a twin-rail frame with anchor feet and gussets. Shape choice `bays` `three | two`.
- **Colour controls:** existing knob names are kept (`enamel`, `polymer`, `rubber`, `stainless`, `steel`), so scenes that set them still work; labels now say what they colour. Added: freezer `display`; snorkel `acrylic`, `knob`; shower `sign`; faucet `hotIndex`, `coldIndex`; dewar rack `foam`, `rubber`. The faucet had only two knobs, now four. Existing `cleanroom` and `highVisibility` presets are kept and set every knob.
- **Shape choices:** +5 (one per asset).
- **Triangles** (default / variant → budget): freezer 996 / 1,044 feet → 1,800; snorkel 1,284 / 1,284 folded → 1,800; shower 1,324 / 668 no eyewash → 1,800; faucet 1,130 / 1,242 four-arm → 1,800; dewar rack 2,542 / 1,724 two bays → 2,600 (was 1,800; the hoops were first drawn as tori at 576 triangles each and replaced with turned rings). Measured in [variant-render-output.txt](variant-render-output.txt) and [variant-renders.json](variant-renders.json).
- **Size changes:** the dewar rack is now 1.84 m wide (was 1.0 m) and the snorkel reaches 1.2 m; scenes that placed them will see new footprints.
- **Ground contact:** each asset rests at z = 0 ([check-assets-output.txt](check-assets-output.txt) reports `minUp 0`).

[before/](before/) keeps the original sources and preview bytes. [variants/](variants/) holds the default, shape-choice and preset renders; [views/](views/) holds front, side, top and rear three-quarter check renders, all from the same sources.

## Gates

- `python3 scripts/checkCatalogQuality.py --kit lab-infrastructure`: 60/60 pass; global 2390/2390 ([quality-kit-output.txt](quality-kit-output.txt), [quality-global-output.txt](quality-global-output.txt)).
- `npx eslint catalog/kits/lab-infrastructure/`: clean ([eslint-output.txt](eslint-output.txt)).
- `npx vitest run tests/integration/catalog/`: 15/15 pass ([catalog-integration-output.txt](catalog-integration-output.txt)).
- `catalog/index.json`: regenerated; only these five rows change.

## Reproduce

From the repository root:

    npx tsx artifacts/catalog-demos/lab-infrastructure-silhouette-20261106/check_assets.ts ultra-low-temperature-freezer articulated-extraction-snorkel laboratory-safety-shower laboratory-faucet-set cryogenic-dewar-storage-rack
    npx tsx scripts/renderCatalogPreviews.ts ultra-low-temperature-freezer articulated-extraction-snorkel laboratory-safety-shower laboratory-faucet-set cryogenic-dewar-storage-rack
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/lab-infrastructure-silhouette-20261106/render_variants.ts
    npx tsx artifacts/catalog-demos/lab-infrastructure-silhouette-20261106/render_variants.ts --views
    python3 artifacts/catalog-demos/lab-infrastructure-silhouette-20261106/capture_demo.py
    python3 scripts/checkCatalogQuality.py --kit lab-infrastructure
    npx eslint catalog/kits/lab-infrastructure/
    npx vitest run tests/integration/catalog/

The branch is not deployed. These are stylized scene props; they do not claim ANSI Z358.1 compliance, extraction airflow, cryogenic ratings or vendor dimensions.
