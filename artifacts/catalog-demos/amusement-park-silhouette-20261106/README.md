# Amusement park: carousel, tea cup, coaster car, drop tower carriage and maintenance cart rebuild (2026-11-06)

**Demo:** [before/after, orthographic check and variant walkthrough](amusement-park-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 70 amusement-park assets already passed the quality gate on colour knobs and presets, but 66 of them had no `path`/`loft`/`revolve`/`extrudePolygon` call; they were stacked `box()`/`cylinder()`. Five of its signature rides did not read as the object:

- **family carousel:** a teal disc with a pole, a lid and eight floating cubes;
- **tea cup spinner car:** a grey drum with four stubs and a black post;
- **junior coaster train car:** a slab with two boxes and four discs, no track;
- **drop tower seat ring:** a donut of upright slabs around a hub;
- **park maintenance cart:** an orange box with a roof slab.

This round rebuilt those five from revolved profiles, a lofted body tub, extruded side profiles and polygon rods. No kit or asset IDs were added.

## Results

- **Family carousel:** about 6.3 m across and 4.7 m to the pennant. Stepped timber deck with painted skirt and boarding step, octagonal centre drum with eight mirror panels and a cornice, a striped conical canopy of sixteen revolved sectors, rounding board with a band, 32-tab scalloped valance, turned finial with pennant. Horses are extruded leaping side profiles with saddle and stirrups, on polished poles at staggered heights, facing the direction of travel. Shape choice `rows` `single | double` (8 outer horses, or 8 + 6 inner).
- **Tea cup spinner car:** a bulging turned cup (2.1 m) with flared lip, foot ring, decorative band and C-shaped handle, on a saucer turntable with a rubber bumper ring. Inside: a horseshoe cushioned bench open to the entry side and a centre spin wheel with grip and hub cap on a turned column. Shape choice `rim` `flared | scalloped` (twelve petals).
- **Junior coaster train car:** a lofted fibreglass tub (low cockpit between raised tail and nose cowl) with side walls, two padded seat rows with contoured backs and T-shaped lap bars, chassis, and at each corner a road wheel, upstop wheel and guide wheel clamping the rail. It sits on a 2.6 m section of twin tubular rails tied to a tubular spine on two feet. Shape choice `car` `lead | trailing` (headlit nose cowl, or a short nose with coupler bar).
- **Drop tower seat ring:** a 6 m square braced lattice tower section on a concrete plinth. The carriage is two rings with spokes and collars, four posts and guide rollers on the tower. Eight outward-facing moulded bucket seats (legs hang free) with padded over-the-shoulder restraints on pivots. Shape choice `restraint` `over-shoulder | lap-bar`.
- **Park maintenance cart:** about 3.2 m long. Sloped front cowl with dash, headlights and bumper; two-seat bench; tilted steering wheel on a column; windscreen; roof canopy on four posts; turned tyres and hubs on a low frame. Shape choice `bed` `cargo-box | flatbed` (open steel box with tailgate, or flatbed with ladder rack and ladder).
- **Colour controls:** existing knob names are kept, so scenes that set them still work, and labels now say what they colour. Added: carousel `canopyCanvas`, `timberDeck`; tea cup `accentEnamel`, `seatVinyl`; coaster `seatVinyl`, `trackPaint`; drop tower `towerPaint`, `concrete`; cart `seatVinyl`, `roofPlastic`, `screenGlass`. Defaults changed to read as the object (carousel red/cream canopy and cream horses, pastel-blue cup on a yellow saucer, blue coaster on orange track, red seats on a cream tower, green cart). `festival` and `twilight` presets are kept and now set every knob (three of the five previously had empty preset bodies).
- **Shape choices:** +5 (one per asset).
- **Triangles** (default / variant → budget): carousel 3,358 / 2,446 single → 3,400 (was 976 / 1,800); tea cup 1,132 / 1,324 scalloped → 1,800 (was 236); coaster 1,244 / 1,196 trailing → 2,000 (was 1,800 budget); drop tower 2,340 / 2,340 lap-bar → 2,400; cart 1,352 / 1,584 flatbed → 1,800. Measured in [variant-render-output.txt](variant-render-output.txt) and [variant-renders.json](variant-renders.json).
- **Size changes:** all five now model real size; the carousel is 6.3 m across, the drop tower section 6 m tall, and the coaster car includes its track. Scenes that placed them will see new footprints.
- **Ground contact:** each asset rests at z = 0 ([check-assets-output.txt](check-assets-output.txt) reports `minUp 0`).

[before/](before/) keeps the original sources and preview bytes. [variants/](variants/) holds the default, shape-choice and preset renders; [views/](views/) holds front, side, top and rear three-quarter check renders, all from the same sources.

## Reproduce

From the repository root:

    npx tsx artifacts/catalog-demos/amusement-park-silhouette-20261106/check_assets.ts family-carousel tea-cup-spinner-car junior-coaster-train-car drop-tower-seat-ring park-maintenance-golf-cart
    npx tsx scripts/renderCatalogPreviews.ts family-carousel tea-cup-spinner-car junior-coaster-train-car drop-tower-seat-ring park-maintenance-golf-cart
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/amusement-park-silhouette-20261106/render_variants.ts
    npx tsx artifacts/catalog-demos/amusement-park-silhouette-20261106/render_variants.ts --views
    python3 artifacts/catalog-demos/amusement-park-silhouette-20261106/capture_demo.py
    python3 scripts/checkCatalogQuality.py --kit amusement-park
    npx eslint catalog/kits/amusement-park/
    npx vitest run tests/integration/catalog/

The branch is not deployed. These are stylized scene props; they do not claim ride engineering, restraint certification or vehicle specifications.

## Untracked generated outputs

`frames/` is not tracked in git; it is regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/amusement-park-silhouette-20261106/capture_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
