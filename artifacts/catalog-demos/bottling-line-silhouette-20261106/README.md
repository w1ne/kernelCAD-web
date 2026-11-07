# Beverage bottling line: filler, carbonation vessel, lobe pump, stretch wrapper and infeed conveyor rebuild (2026-11-06)

**Demo:** [before/after, orthographic check and variant walkthrough](bottling-line-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 50 beverage-bottling-line assets already passed the quality gate. But the kit was built entirely from a shared `boxPart()`/`cylinderPart()` helper, with a regex picking each part's colour from its name. It had zero `path`/`loft`/`revolve`/profile calls, the lowest of any kit. Five of the line's most recognisable machines did not read as their object:

- **rotary filler:** a stack of discs with pegs, plus loose bottles made of three cylinders each;
- **carbonation vessel:** a capped cylinder on four square legs;
- **sanitary lobe pump:** a cylinder and two boxes on a slab;
- **stretch wrapper:** a disc beside a post with a box on it, and no pallet;
- **bottle infeed conveyor:** a plank on four square legs.

This round rebuilt those five from revolved profiles, profiled extrusions along X (C-channels, stadium casings, a finned motor body), star-wheel polygons and polygon rods. No kit or asset IDs were added. These are silhouette rebuilds, not promotions from thin assets.

## Results

- **Rotary filler:** a revolved plinth with a kick band and filler table. A star-wheel bottle carrier carries a circle of revolved PET bottles. Above them is a ring product bowl on a central column with a rotary distributor and product inlet. There is one filling valve per head, each with an arm, actuator and nozzle directly over its bottle. Infeed and outfeed belts carry star wheels and queued bottles. A guard frame with a top ring sits around the back, with a door handle, an HMI on a swing arm, an e-stop and a beacon. Shape choice: `heads` `10 | 12 | 16`.
- **Carbonation vessel:** a revolved stainless shell with a dished top head and a dished or cone bottom. It has an insulated jacket band with three stiffener rings, and three splayed legs on revolved ball feet with leg pads. On top are a clamped manway with a gasket and handle, a relief valve and the product inlet. A dial pressure gauge sits on the side. A sight-glass level tube runs on two fittings, and a CO2 line with a regulator runs down to a sparger inlet. There is a bottom outlet valve with a handle. Shape choice: `bottom` `dished | cone`.
- **Sanitary lobe pump:** an oblong (stadium) pump casing with a front cover, cover seal and domed cap nuts. Two opposed ports end in tri-clamp ferrules with gaskets. Behind are the gearbox, an arched safety-yellow coupling guard, and a finned TEFC motor with an end shield, fan cowl, grille, terminal box and gland. Everything sits on a stainless baseplate with revolved levelling feet. Shape choice: `ports` `horizontal | vertical` (vertical rotates the casing and turns the outlet out to -Y).
- **Stretch wrapper:** a square base with a loading ramp and a revolved turntable. The mast has a guide track and cap, and a control cabinet with an e-stop. The film carriage carries a film roll and two pre-stretch rollers. Mid-cycle, a timber pallet holds four layers of corrugated cases, wrapped in film up to the carriage with the top layer still bare, and a film web runs from the roll to the load corner. Shape choice: `load` `wrapping | empty`.
- **Bottle infeed conveyor:** formed C-channel side frames and a tabletop chain (carry run, return run, end sprockets). Wear-strip guide rails sit on adjustable rod brackets, holding a queue of revolved PET bottles backed up to the discharge. A hanging geared drive motor, a dead plate and a jam photo-eye sit at the ends, on braced legs with revolved sanitary feet. Shape choice: `lanes` `single | double`.
- **Colour controls:** each asset has four material knobs. Existing knob names are kept, so scenes that set them still work, and labels now say what they colour. Added: vessel `safetyPaint` (CO2 line, relief valve); pump `safetyPaint` (coupling guard) and `foodPolymer` (gaskets); wrapper `palletTimber`, with `foodPolymer` re-purposed as stretch film (default lightened to `#c9dfe2`); conveyor `petBottle`. The filler's `foodPolymer` now also colours the PET bottles. Existing preset names (`sanitaryLine`, `legacyPlant`) are kept, and they now set every knob.
- **Shape choices:** +5 in total (one per asset; the filler's has three values).
- **Triangles** (default / variants → budget): filler 5,404 / 4,864 for 10 heads / 6,484 for 16 heads → 6,800 (was 2,416 / 2,800). Vessel 2,142 / 2,106 cone → 2,400 (was 412 / 2,200). Pump 1,584 / 1,716 vertical → 2,000 (was 304 / 2,200). Wrapper 1,004 / 536 empty → 1,200 (was 356 / 2,200). Conveyor 2,300 / 2,808 double → 3,000 (was 208 / 2,200). The filler is now the heaviest asset in the kit. Each revolved bottle costs about 106 triangles, and the filler carries 14 to 20 of them. Measured values are in [variant-render-output.txt](variant-render-output.txt) and [variant-renders.json](variant-renders.json).
- **Size changes:** the vessel grows to about 1.81 m tall and the conveyor to 1.8 m long. The wrapper now has a full 1.76 m base with a 2.77 m mast. Scenes that placed them will see the new footprints.
- **Ground contact:** each asset rests on flat-bottomed feet or bases at z = 0, and the catalog test's `minUpM = 0` check passes.

[before/](before/) keeps the original sources and preview bytes. [variants/](variants/) holds the default, shape-choice and preset renders. [views/](views/) holds front, side, top and rear three-quarter check renders. All of them are made from the same sources.

## Reproduce

From the repository root:

    npx tsx artifacts/catalog-demos/bottling-line-silhouette-20261106/check_assets.ts rotary-filler carbonation-vessel sanitary-lobe-pump stretch-wrapper bottle-infeed-conveyor
    npx tsx scripts/renderCatalogPreviews.ts rotary-filler carbonation-vessel sanitary-lobe-pump stretch-wrapper bottle-infeed-conveyor
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/bottling-line-silhouette-20261106/render_bottling_variants.ts
    npx tsx artifacts/catalog-demos/bottling-line-silhouette-20261106/render_bottling_variants.ts --views
    python3 artifacts/catalog-demos/bottling-line-silhouette-20261106/capture_bottling_demo.py
    python3 scripts/checkCatalogQuality.py --kit beverage-bottling-line
    npx eslint catalog/kits/beverage-bottling-line/
    npx vitest run tests/integration/catalog/

The branch is not deployed. These are stylized scene props. They are not process-equipment, pressure-vessel or machine-guarding specifications.
