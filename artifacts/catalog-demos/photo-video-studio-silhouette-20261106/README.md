# Photo/video studio: DSLR, telephoto lens, tripod, softbox and cinema camera rebuild (2026-11-06)

**Demo:** [before/after, orthographic check and variant walkthrough](photo-video-studio-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 40 photo-video-studio assets already passed the quality gate on colour knobs and presets. But every asset was stacked `box()`/`cylinder()` calls, with zero `path`/`loft`/`revolve`/`extrudePolygon` calls. Five of the kit's most recognisable objects did not read as their object:

- **digital SLR camera:** a box with a smaller box on top and a plain cylinder for a lens;
- **telephoto lens:** a stack of cylinders standing on end;
- **camera tripod:** three square bars crossing in an X, with square feet;
- **softbox light:** five tan slabs on a pole over a single bar foot;
- **cinema camera:** a box with a cylinder and a smaller box in front.

This round rebuilt those five from revolved profiles, lofted frusta, profiled extrusions, ribbed/gear polygons and polygon rods. No kit or asset IDs were added. These are silhouette rebuilds, not promotions from thin assets.

## Results

- **Digital SLR camera:** real size (146 × 111 × 166 mm with lens). Front-profiled body with stepped shoulders, a deep rubber grip bulging forward on the user's right, and a pentaprism hump with hot shoe, eyepiece, eyecup and viewfinder glass. On top are a ribbed mode dial, top LCD, shutter button and collar. There are front and rear command dials, a bayonet mount ring with a lens release button, strap lugs, a rear screen in a bezel, a thumb pad and a multi-controller. The revolved lens has a ribbed zoom ring, a focus ring, an index band and a recessed front element. Shape choice: `lens` `kit-zoom | prime-50`.
- **Telephoto lens:** lies on its tripod-collar foot, axis along +X. It has a bayonet mount and contacts, a rear barrel, a ribbed zoom ring, a collar ring with lock knob, a pillar and slotted foot with pad, a flared mid barrel with an AF/IS switch panel, a ribbed focus ring on a stepped seat, a front barrel with hood bayonet band, and a recessed front element. Shape choice: `hood` `fitted | reversed | none` (reversed flips the hood back over the barrel).
- **Camera tripod:** about 1.42 m to the platform. Revolved spider casting with three hinge lugs and pins. Each leg has three telescoping sections that step down in diameter, a foam grip, flip-lock clamps with levers at each joint, and a revolved rubber foot. Centre column with a lock collar and knob, ballast hook and top plate. Shape choice: `head` `ball | pan-tilt` (ball head with lock knob, clamp and quick-release plate; or pan-tilt with tilt hub, long pan handle and grip).
- **Softbox light:** about 1.92 m tall. A fabric shell lofted from the speedring to the front opening, with a white diffuser inset so a dark rim shows. A monolight sits behind the revolved speedring, with a body, cooling grille, rear panel, display and handle. An umbrella bracket (yoke, tilt hub, lever, socket) sits on a light stand with a three-section column, collars and lock knobs, a leg collar, a brace collar, three legs with braces, and revolved feet. Shape choice: `shape` `rectangle | octabox | strip`.
- **Cinema camera:** a baseplate and riser with a rod clamp and twin 15 mm rods. The sensor body is side-profiled with a chamfered rear top, cooling fins on -X, and a side screen with menu buttons on +X. A PL mount carries a revolved cine prime with gear-toothed focus and iris rings, a focus-scale ring and a front element. Above are a top handle with posts, a front rubber grip and an offset EVF on an arm with eyecup and glass; at the back a V-mount plate, battery and gauge. Shape choice: `matteBox` `fitted | none` (fitted adds a lofted matte box with filter, filter tray, tilted top flag, angled side wings and rod bracket).
- **Colour controls:** existing knob names are kept, so scenes that set them still work, and labels now say what they colour. Added: telephoto `enamel` (the off-white barrel paint), tripod `anodized` (flip locks, pins, collar, QR clamp), cinema camera `rubber` (grip, eyecup, fins, battery). Softbox `fabric` now colours the dark shell; its default changed from `#e5ddce` to `#2a2d31`. The `studioBlack` and `fieldRental` presets are kept, and they now set every knob.
- **Shape choices:** +5 in total (one per asset).
- **Triangles** (default / variants → budget): DSLR 1,732 / 1,480 prime → 2,000 (was 224 / 1,800). Telephoto 1,414 / 1,414 reversed / 1,278 none → 1,800 (was 320 / 1,800). Tripod 1,720 / 1,606 pan-tilt → 2,000 (was 208 / 1,800). Softbox 1,212 / 1,244 octabox / 1,212 strip → 1,500 (was 160 / 1,800). Cinema camera 1,466 / 1,394 none → 1,800 (was 192 / 1,800). Measured values are in [variant-render-output.txt](variant-render-output.txt) and [variant-renders.json](variant-renders.json).
- **Size changes:** the DSLR shrinks to real size (it was about 1.7× oversize). The telephoto now lies on its foot instead of standing on its mount. The tripod and softbox stand grow to full working height. Scenes that placed them will see new footprints.
- **Ground contact:** each asset rests on a flat-bottomed plate, foot or pad at z = 0 ([check-assets-output.txt](check-assets-output.txt) reports `minUp 0`), and the catalog test's `minUpM = 0` check passes.

[before/](before/) keeps the original sources and preview bytes. [variants/](variants/) holds the default, shape-choice and preset renders. [views/](views/) holds front, side, top and rear three-quarter check renders. All of them are made from the same sources. `quick_render.ts` is the scratch renderer used while authoring (any yaw, pitch and knob overrides).

## Reproduce

From the repository root:

    npx tsx artifacts/catalog-demos/photo-video-studio-silhouette-20261106/check_assets.ts digital-slr-camera telephoto-lens camera-tripod softbox-light cinema-camera
    npx tsx scripts/renderCatalogPreviews.ts digital-slr-camera telephoto-lens camera-tripod softbox-light cinema-camera
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/photo-video-studio-silhouette-20261106/render_variants.ts
    npx tsx artifacts/catalog-demos/photo-video-studio-silhouette-20261106/render_variants.ts --views
    python3 artifacts/catalog-demos/photo-video-studio-silhouette-20261106/capture_demo.py
    python3 scripts/checkCatalogQuality.py --kit photo-video-studio
    npx eslint catalog/kits/photo-video-studio/
    npx vitest run tests/integration/catalog/

The branch is not deployed. These are stylized scene props. They do not claim optical accuracy, lighting performance, load rating or camera operation.
