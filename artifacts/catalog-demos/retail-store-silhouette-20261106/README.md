# Retail store: shopping cart, stock ladder, trolley corral, barcode scanner and payment terminal rebuild (2026-11-06)

**Demo:** [before/after, orthographic check and variant walkthrough](retail-store-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 48 retail-store assets already passed the quality gate on colour knobs and presets, but none of them had a `path`/`revolve`/`extrudePolygon` call. Five of them did not read as the object:

- **shopping cart:** a straight-sided box cage on four legs, with no taper, no nose overhang, no child seat and a flat handle slab;
- **stock ladder:** a slab on two posts with three floating boards, with no stiles, platform rails or handrail;
- **trolley corral:** a front gate and an end stop floating apart, with knee-high plates in between and nothing a cart could be pushed into;
- **barcode scanner:** a tilted box on a slab;
- **payment terminal:** a tilted box on a slab, with no keypad keys or card slot.

This round rebuilt those five from oriented rods, revolved profiles and extruded side profiles. No kit or asset IDs were added.

## Results

- **Shopping cart:** 580 mm wide, 1.04 m long, 0.97 m to the handle. The tapered wire basket is narrower and lower at the nose and overhangs the chassis. It has a rim, two rings, side, front and floor wires, plastic nose bumpers, and a rear gate with a folded child-seat flap on a hinge bar. Two raked brackets carry the plastic push bar. The nesting U chassis has rear legs, front struts and a wire lower tray, with two swivel and two fixed casters that have rubber tyres and plastic hubs. Shape choice `childSeat` `seat | none`.
- **Stock ladder:** 650 mm wide, 0.98 m deep, 0.9 m to the platform and 1.6 m to the handrail. It has raked front stiles and vertical rear legs with base rails, diagonals and gussets. The three ribbed aluminium treads and the platform have anti-slip nosings. There are rubber feet at the front and casters at the rear. The handrail cage follows the stiles and runs round the platform, with mid rails and rubber grips. Shape choice `handrail` `full | none` (a low step stand with no rails).
- **Trolley corral:** 4.79 m long and 1.47 m wide at the flared mouth, with the sign 2.08 m tall. Galvanized rails run at chassis, basket and top height on bolted posts that have base plates, rubber pads and domed caps. At the closed end, the basket and top rails bend through a half loop to an end post with a rubber bumper. The entry flares out to two posts with rubber sleeves. A twin-post sign faces the entry, with a cart pictogram and a lettering band. Shape choice `bays` `four | two`.
- **Barcode scanner:** the handheld scanner is a pistol-grip profile with a flared head, a glass window in a rubber nose bumper, a trigger, grip overmould and a status light. It stands butt-down in a cradle cup on a weighted base and trails a coiled cable (0.44 m deep with the cable, 0.34 m tall). Shape choice `style` `handheld | bioptic`. The bioptic option is an in-counter platter with a scale plate, produce lip and glass window, plus a narrower raked tower window. Both windows show crossed scan lines, and there is a status bar and a customer display.
- **Payment terminal:** an 84 x 190 mm handset with a chip-reader lip and card slot, magstripe groove, screen with bezel and contactless mark, a 4 x 3 keypad, and cancel / clear / enter keys. It is tilted towards the customer on a weighted swivel stand. Shape choice `type` `pinpad | portable`. The portable option has a longer handset with a printer cover and tear bar, sitting in a charging base with an LED.
- **Colour controls:** existing knob names are kept (`stainless`, `polypropylene`, `rubber`, `aluminium`, `powderCoat`, `galvanizedSteel`, `abs`, `glass`, `polycarbonate`), so scenes that set them still work. Their labels now say what they colour. New knobs: cart `chassis`, ladder `nosing`, corral `signFace`, scanner `rubber`, terminal `enterKey`. Each asset now has four material knobs, and the existing `cleanStore` and `nightRestock` presets set every knob.
- **Shape choices:** +5 (one per asset).
- **Triangles** (default / variant → budget): cart 1,932 / 1,892 no seat → 2,200 (was 1,800); ladder 1,236 / 900 no handrail → 1,800; corral 2,404 / 1,884 two bays → 2,600 (was 1,800); scanner 942 / 188 bioptic → 1,800; terminal 592 / 428 portable → 1,800. Measured in [variant-render-output.txt](variant-render-output.txt) and [variant-renders.json](variant-renders.json).
- **Size changes:** the corral is now 4.79 m long (it was 1.8 m) and has a 2.08 m sign. The ladder is now 1.6 m tall with its handrail. Scenes that placed these assets will see new footprints.
- **Ground contact:** each asset rests at z = 0 ([check-assets-output.txt](check-assets-output.txt) reports `minUp 0`).

[before/](before/) keeps the original sources and preview bytes. [variants/](variants/) holds the default, shape-choice and preset renders. [views/](views/) holds front, side, top and rear three-quarter check renders. All are rendered from the same sources.

## Gates

- `python3 scripts/checkCatalogQuality.py --kit retail-store`: 48/48 pass; global 2390/2390 ([quality-kit-output.txt](quality-kit-output.txt), [quality-global-output.txt](quality-global-output.txt)).
- `npx eslint catalog/kits/retail-store/`: clean ([eslint-output.txt](eslint-output.txt)).
- `npx vitest run tests/integration/catalog/`: 15/15 pass ([catalog-integration-output.txt](catalog-integration-output.txt)).
- `catalog/index.json`: regenerated; only these five rows change.

## Reproduce

From the repository root:

    npx tsx artifacts/catalog-demos/retail-store-silhouette-20261106/check_assets.ts shopping-cart stock-ladder trolley-corral barcode-scanner payment-terminal
    npx tsx scripts/renderCatalogPreviews.ts shopping-cart stock-ladder trolley-corral barcode-scanner payment-terminal
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/retail-store-silhouette-20261106/render_variants.ts
    npx tsx artifacts/catalog-demos/retail-store-silhouette-20261106/render_variants.ts --views
    python3 artifacts/catalog-demos/retail-store-silhouette-20261106/capture_demo.py
    python3 scripts/checkCatalogQuality.py --kit retail-store
    npx eslint catalog/kits/retail-store/
    npx vitest run tests/integration/catalog/

The branch is not deployed. These are stylized scene props. They do not claim vendor dimensions, EN 131 / ANSI ladder ratings, or payment-terminal certification.
