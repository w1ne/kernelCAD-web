# Telecom infrastructure: microwave dish, Yagi, sector panel, dual sector array and remote radio unit rebuild (2026-11-06)

**Demo:** [before/after, orthographic check and variant walkthrough](telecom-infrastructure-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 56 telecom-infrastructure assets already passed the quality gate on colour knobs and presets. However, 53 of them are stacked `box()`/`cylinder()` calls, and the five radio assets a telecom scene depends on did not read as the object:

- **microwave dish:** a flat 16-gon disc on a post, beside a floating feed arm, on a teal slab;
- **Yagi:** a boom with four flat plates hanging below it and a clamp puck, with no mast and the elements off-axis;
- **sector panel:** a plain slab with a rail behind it and a connector block floating behind the base;
- **dual sector array:** two slabs and a rail, with the clamp bars floating 200 mm behind and the connectors floating below;
- **remote radio unit:** a teal box between two loose plates, with two connectors lying on the ground below it.

This round rebuilt those five at real size on pole mounts, from revolved profiles, extruded sections and oriented rods. No kit or asset IDs were added.

## Results

- **Microwave dish:** a 0.6 m paraboloid reflector (f/D 0.25, revolved shell with a rolled rim) with a back ring. The dish centre is 1.0 m up. Shape choice `style` is `shrouded | open`. `shrouded` gives a cylindrical shroud closed by a flat radome with a clamp band. `open` gives a feed horn at the focus on a waveguide, held by three struts. A square finned outdoor radio unit with a carry handle and N-type port bolts to the back. A fine-adjust mount has two pole collars, side arms, bridges and an elevation strut with a nut. It sits on a 76 mm pole with a cap, a gusseted base plate and anchor nuts.
- **Yagi:** seven elements on a 1.45 m square aluminium boom 1.5 m up: the reflector, a folded-dipole driven element with its balun box and gland, and five directors that get shorter towards the tip. Each element sits on a black insulator, and the boom has end caps. A clamp plate holds the boom with two U-bolts round the mast and two round the boom. The coax runs from the balun to the mast and down it under cable ties to the gusseted base plate. Shape choice `polarization` is `horizontal | vertical`.
- **Sector panel:** a 1.4 m × 300 × 140 mm radome with a rounded D-section front and a flat back (an extruded section), moulded end caps and a rear spine. The bottom cap carries four 4.3-10 connectors and a remote-tilt motor, and four jumpers curl back to the pole and down to the plate. Upper and lower tilt brackets have twin arms to clamp collars on a 2.3 m pole. Shape choice `tilt` is `plumb | downtilt`. `downtilt` leans the top forward 6° about the lower pivot, and the upper arms stretch to suit (see the side view).
- **Dual sector array:** a 2.6 m centre pole with twin galvanized crossbars clamped to it. A 1.75 m mounting pipe at each end carries a full sector panel (radome, caps, spine, brackets, arms, pipe collars and two connectors). The jumpers run back along the crossbar and down the pole. Shape choice `azimuth` is `splayed | parallel`. `splayed` turns each panel 30° outward about its pipe (see the top views).
- **Remote radio unit:** a 400 × 160 × 480 mm cast housing with chamfered front corners, a top cover and eleven full-height cooling fins, plus a carry handle. The underside connector panel has two RF ports, a DC plug, two fibre ports and a ground lug with its wire, and the cables drop down the pole to the plate. A back bracket plate, arms and bridges hold two clamp collars on a 1.74 m pole. Shape choice `sunshield` is `fitted | none`. `fitted` adds a folded top-and-sides shield on spacers.
- **Colour controls:** existing knob names are kept (`aluminum`, `galvanizedSteel`, `powderCoat`, `stainlessSteel`, `polymer`), so scenes that set them still work, and their labels now say what they colour. New knobs: dish `radome`, Yagi `boom` and `polymer`, sector panel `radome` and `galvanizedSteel`, dual array `radome`, RRU `housing`. Every asset now has four material knobs (the dual array has five), and the existing `fieldSite` and `highVisibility` presets set every knob.
- **Shape choices:** +5 (one per asset).
- **Triangles** (default / variant → budget): dish 1,486 / 1,386 open → 1,800 (was 900); Yagi 1,232 / 1,232 vertical → 1,800 (was 900); sector panel 1,232 / 1,232 downtilt → 1,800 (was 900); dual array 2,036 / 2,036 parallel → 2,600 (was 900); RRU 1,616 / 1,480 no shield → 1,800 (was 900). Counts come from [variant-render-output.txt](variant-render-output.txt) and [variant-renders.json](variant-renders.json).
- **Size changes:** all five now stand on their own pole and base plate at real size. They are 1.44 m to 2.62 m tall, where before they were 0.47 m to 1.32 m. Scenes that placed these assets will see new footprints and heights.
- **Ground contact:** each asset rests at z = 0 ([check-assets-output.txt](check-assets-output.txt) reports `minUp 0`).

[before/](before/) keeps the original sources and preview bytes. [variants/](variants/) holds the default, shape-choice and preset renders. [views/](views/) holds front, side, top and rear three-quarter check renders. Every image is rendered from the committed sources.

## Gates

- `python3 scripts/checkCatalogQuality.py --kit telecom-infrastructure`: 56/56 pass; global 2390/2390 ([quality-kit-output.txt](quality-kit-output.txt), [quality-global-output.txt](quality-global-output.txt)).
- `npx eslint catalog/kits/telecom-infrastructure/`: clean ([eslint-output.txt](eslint-output.txt)).
- `npx vitest run tests/integration/catalog/`: 15/15 pass ([catalog-integration-output.txt](catalog-integration-output.txt)).
- `catalog/index.json`: regenerated; only these five rows change.

## Reproduce

From the repository root:

    npx tsx artifacts/catalog-demos/telecom-infrastructure-silhouette-20261106/check_assets.ts microwave-dish-antenna yagi-radio-antenna sector-panel-antenna dual-sector-panel-array remote-radio-unit
    npx tsx scripts/renderCatalogPreviews.ts microwave-dish-antenna yagi-radio-antenna sector-panel-antenna dual-sector-panel-array remote-radio-unit
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/telecom-infrastructure-silhouette-20261106/render_variants.ts
    npx tsx artifacts/catalog-demos/telecom-infrastructure-silhouette-20261106/render_variants.ts --views
    python3 artifacts/catalog-demos/telecom-infrastructure-silhouette-20261106/capture_demo.py
    python3 scripts/checkCatalogQuality.py --kit telecom-infrastructure
    npx eslint catalog/kits/telecom-infrastructure/
    npx vitest run tests/integration/catalog/

The branch is not deployed. These are stylized scene props. They do not claim vendor dimensions, antenna gain or pattern, RF exposure compliance, or wind-load ratings for any mount.
