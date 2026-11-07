# Solar energy: pole transformer, carport, string inverter, weather station and cleaning robot rebuild (2026-11-06)

**Demo:** [before/after, orthographic check and variant walkthrough](solar-energy-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 40 solar-energy assets already passed the quality gate on colour knobs and presets. But the kit had zero `path`/`loft`/`revolve`/`extrudePolygon` calls; every asset was stacked `box()`/`cylinder()`. Five of its most recognisable objects did not read as the object:

- **pole-mount transformer:** a short post with a crossarm, three ceramic cylinders and a big can, about 1.4 m tall;
- **solar carport canopy:** four square posts and two beams with six loose panels on top;
- **string inverter:** a cabinet on a plinth with stacked slats;
- **solar weather station:** a pole with three cubes and a slab;
- **PV panel cleaning robot:** a box on two tracks.

This round rebuilt those five from revolved profiles, a lofted pole, extruded steel sections (I-beam, C-purlin, wide-flange, unistrut), bristle and hood profiles, and polygon rods. No kit or asset IDs were added. These are silhouette rebuilds, not promotions from thin assets.

## Results

- **Pole-mount transformer:** a tapered timber pole about 7.6 m above grade (lofted), with a top cap. It carries a crossarm with a through bolt and two diagonal braces, and three porcelain pin insulators (two on the arm, one on the pole top) with line conductors. A fused cutout on a bracket has its fuse tube and jumpers down to the lid HV bushing. The round tank has a domed lid, stiffener ring, hanger bracket and bolts, nameplate and drain valve, plus a surge arrester on a bracket. Three side LV bushings feed a service drop, and a ground wire with a guard runs down the pole. Shape choice: `rating` `25kva | 50kva | 100kva` (tank radius and height).
- **Solar carport canopy:** two stalls, about 5.9 × 5.2 m, with 2.7–3.5 m clearance. Concrete piers carry base plates, wide-flange columns and caps. Sloped I-beam girders and six C-purlins hold fifteen portrait modules (frame, glass, cell seam) at 8°, with an aluminium drip gutter on the low edge. Also: knee braces, two wheel stops, and an EV charger on the right rear column with a screen, holster and hanging cable loop. Shape choice: `structure` `four-post | cantilever`. Cantilever uses one rear row of columns with raking struts and back braces.
- **String inverter:** stands on a galvanized two-post unistrut stand with foot plates, braces and two rails. Behind the enclosure is a finned heat sink. The sealed enclosure has a chamfered side profile, front cover, LED strip, display window and logo band. A tilted sun and rain hood sits on arms. Underneath are paired MC4 string connectors, two red DC isolator knobs, AC and comms glands, and string and AC cables routed to a ground conduit. Shape choice: `rating` `commercial | utility` (body 760 or 1050 mm wide, 5 or 8 strings).
- **Solar weather station:** about 3.2 m tall. A tripod with collar, splayed legs, feet and struts holds a centre mast. On the mast: a logger enclosure with door seam, latch and glands, and a sun-facing PV charging panel. A stacked-plate radiation shield sits on an arm. Two glass-domed pyranometers sit on a levelled arm, one flat (global horizontal) and one tilted 25° (plane of array). There is also a funnel-topped rain gauge, a crossarm and a lightning rod. Shape choice: `wind` `cups-vane | ultrasonic` (cup anemometer with a counterweighted wind vane, or a three-arm ultrasonic sensor).
- **PV panel cleaning robot:** about 2.6 m long. It has a full-height aluminium beam with a top rib, a bristle brush roll on an axle under a curved polymer hood, upper and lower drive carriages with four wheels and hubs, a small PV charging panel, and a control box with a status LED and antenna. Shape choice: `placement` `on-row | parked`. On-row shows it riding a 25° one-in-portrait section: three modules, two purlins, a torque tube, two wide-flange posts and bearings. Parked shows it flat on its wheels.
- **Colour controls:** existing knob names are kept, so scenes that set them still work, and labels now say what they colour. Added: transformer `hardware`, carport `concrete` and `chargerPlastic`, inverter `isolatorPolymer`, robot `solarGlass`. Default changes: transformer tank paint `#687c7c` → `#8f9a98`; inverter enclosure `#687c7c` → `#dfe3e1` (light grey, as field inverters are); weather station polymer `#daddd7` → `#e9ebe6`; robot hood `#daddd7` → `#f0b429` (safety yellow). `fieldService` and `highVisibility` presets are kept, and they now set every knob.
- **Shape choices:** +5 in total (one per asset).
- **Triangles** (default / variants → budget): transformer 1,848 (all ratings) → 2,000 (was 232 / 1,800). Carport 1,504 / 1,280 cantilever → 1,800 (was 216). Inverter 1,252 / 1,084 commercial → 1,800 (was 336). Weather station 1,752 / 1,590 ultrasonic → 1,800 (was 116). Robot 872 / 592 parked → 1,800 (was 456). Measured values are in [variant-render-output.txt](variant-render-output.txt) and [variant-renders.json](variant-renders.json).
- **Size changes:** all five now model real size instead of a roughly half-scale stand-in. The pole is 7.8 m tall and the carport 5.9 m wide. The inverter is raised on a stand, and the robot is shown on a row section. Scenes that placed them will see new footprints.
- **Ground contact:** each asset rests at z = 0 ([check-assets-output.txt](check-assets-output.txt) reports `minUp 0`), and the catalog test's `minUpM = 0` check passes.

[before/](before/) keeps the original sources and preview bytes. [variants/](variants/) holds the default, shape-choice and preset renders. [views/](views/) holds front, side, top and rear three-quarter check renders. All of them are made from the same sources. `quick_render.ts` is the scratch renderer used while authoring (any yaw, pitch and knob overrides), and `part_triangles.ts` lists the heaviest parts for budget tuning.

## Reproduce

From the repository root:

    npx tsx artifacts/catalog-demos/solar-energy-silhouette-20261106/check_assets.ts pole-mount-transformer solar-carport-canopy string-inverter solar-weather-station pv-panel-cleaning-robot
    npx tsx scripts/renderCatalogPreviews.ts pole-mount-transformer solar-carport-canopy string-inverter solar-weather-station pv-panel-cleaning-robot
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/solar-energy-silhouette-20261106/render_variants.ts
    npx tsx artifacts/catalog-demos/solar-energy-silhouette-20261106/render_variants.ts --views
    python3 artifacts/catalog-demos/solar-energy-silhouette-20261106/capture_demo.py
    python3 scripts/checkCatalogQuality.py --kit solar-energy
    npx eslint catalog/kits/solar-energy/
    npx vitest run tests/integration/catalog/

The branch is not deployed. These are stylized scene props. They do not claim electrical ratings, structural design, sensor accuracy or robot operation.
