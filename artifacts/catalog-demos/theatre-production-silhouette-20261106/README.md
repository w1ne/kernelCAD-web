# Theatre production: ellipsoidal, Fresnel, PAR can, chain hoist and followspot rebuild (2026-11-06)

**Demo:** [before/after, orthographic check and variant walkthrough](theatre-production-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 52 theatre-production assets already passed the quality gate on colour knobs and presets, but 51 of them were stacked `box()`/`cylinder()` calls. The five lighting and rigging assets a stage scene depends on most did not read as the object:

- **ellipsoidal:** a box with a cylinder through it, a lens disc and a gold yoke standing on the floor beside it;
- **Fresnel:** a cube with a tall cylinder standing upright out of the top and a block for a spigot underneath;
- **PAR can:** an upright cylinder with two gold strips stuck to the sides;
- **chain hoist:** a box with a handle, a single rod for the chain and a flat hook;
- **followspot stand:** a slab, a post and an empty saddle, with no followspot on it.

This round rebuilt those five at real size from revolved profiles, extruded sections and oriented rods. No kit or asset IDs were added.

## Results

- **Ellipsoidal reflector spotlight:** bulbous reflector housing with cooling ribs, a rear lamp cap with knob and cord, a shutter barrel with four diagonal shutter handles and a gobo slot, a slightly tapered lens tube with a focus knob in a slot, and a gel-frame holder with runners and an open frame showing the gel. A flat-strap yoke with tilt-lock handles hangs from a C-clamp on a pipe stub. Shape choice `lensTube` is `19deg | 26deg | 50deg` (380, 290 or 150 mm tube; see the side views). Origin stays `center`.
- **Fresnel wash fixture:** a short fat drum (330 mm) with a bezel and a four-step Fresnel lens, a rear lamp cap with a louvred top cover, a focus slider and knob underneath, and gel-frame runners. It has a strap yoke with tilt locks on a C-clamp. Shape choice `barnDoor` is `fitted | none`. `fitted` adds a ring with two large and two small leaves opened about 35°.
- **PAR can fixture:** a PAR64 can (236 mm diameter) with three rolled beads, a back cap with lamp socket and cord, a front ring with the lamp face, a spring-clipped gel frame, and a strap yoke with hand-wheel tilt locks. Shape choice `mounting` is `hung | floor`. `hung` puts it on a C-clamp and pipe, tilted 30° down. `floor` flips the fixture so the yoke strap is the foot, adds rubber feet, and tilts the can 25° up.
- **Motorized chain hoist:** a round cast body lying sideways with a ribbed gear case, finned motor cover and end cap, a brake end, a carry handle and a multipin connector. A swivel hook sits in a round sling around an I-beam stub. Real alternating-plane link chain runs to a latched load hook, with a chain bag and a control cable. Shape choice `rig` is `standard | climbing`. `climbing` hangs the chain hook from the sling and turns the motor upside down on the chain, so the motor's own hook carries the load.
- **Followspot on stand:** a 1.2 m barrel with a lens tube and front lens, and a colour boomerang box with six gel levers. It has a main barrel with an iris ring and lever, a ventilated lamp house with a chimney, a sighting scope on posts, and two rear operator handles with rubber grips. It sits on a yoke with tilt locks and a pan head. Shape choice `stand` is `tripod | pedestal`. `tripod` has a column, height clamp, three braced legs and castors. `pedestal` has a weighted round base. The title changes from "Followspot stand" to "Followspot on stand"; the ID is unchanged.
- **Colour controls:** existing knob names are kept (`powderCoat`, `aluminum`, `hardware`, `glass`, `paintedSteel`, `galvanizedSteel`, `rubber`), so scenes that set them still work. Their labels now say which parts they colour. The followspot gains `glass` and `rubber`, going from two to four material knobs. Every asset now has four material knobs, and the `houseShow` and `touring` presets set every knob. The touring presets were retuned so each reads as a distinct scheme: a white-body ERS, a polished silver PAR with a magenta gel, and a yellow hoist with a purple sling.
- **Shape choices:** +5 (one per asset).
- **Triangles** (default / variant → budget): ellipsoidal 1,442 / 1,442 (19°) / 1,428 (50°) → 1,800; Fresnel 1,144 / 1,000 (no barn door) → 1,800; PAR 1,056 / 964 (floor) → 1,800; hoist 1,796 / 1,736 (climbing) → 2,400 (was 1,800); followspot 2,024 / 1,864 (pedestal) → 2,400 (was 1,800). Counts come from [variant-render-output.txt](variant-render-output.txt) and [variant-renders.json](variant-renders.json).
- **Size changes:** the hoist is now 1.94 m tall including its beam (was about 1.5 m including the bail). The followspot is 1.62 m tall and 1.46 m long. The three luminaires now include their clamp and a pipe stub, at 0.58 to 0.72 m tall. Scenes that placed these assets will see new footprints and heights.
- **Ground contact:** the Fresnel, PAR and hoist collect their parts and lift the whole model by the lowest exact bounding-box point, so each `base`-origin asset rests at z = 0 in every shape choice. [check-assets-output.txt](check-assets-output.txt) reports `minUp 0` for all four `base` assets. The ellipsoidal keeps its `center` origin.

[before/](before/) keeps the original sources and preview bytes. [variants/](variants/) holds the default, shape-choice and preset renders. [views/](views/) holds front, side, top and rear three-quarter check renders. Every image is rendered from the committed sources.

## Gates

- `python3 scripts/checkCatalogQuality.py --kit theatre-production`: 52/52 pass; global 2390/2390 ([quality-kit-output.txt](quality-kit-output.txt), [quality-global-output.txt](quality-global-output.txt)).
- `npx eslint catalog/kits/theatre-production/ artifacts/catalog-demos/theatre-production-silhouette-20261106/`: clean ([eslint-output.txt](eslint-output.txt)).
- `npx vitest run tests/integration/catalog/`: 15/15 pass ([catalog-integration-output.txt](catalog-integration-output.txt)).
- `catalog/index.json`: regenerated; only these five rows change.

## Reproduce

From the repository root:

    npx tsx artifacts/catalog-demos/theatre-production-silhouette-20261106/check_assets.ts ellipsoidal-reflector-spotlight fresnel-wash-fixture par-can-fixture motorized-chain-hoist spotlight-followspot-stand
    npx tsx scripts/renderCatalogPreviews.ts ellipsoidal-reflector-spotlight fresnel-wash-fixture par-can-fixture motorized-chain-hoist spotlight-followspot-stand
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/theatre-production-silhouette-20261106/render_variants.ts
    npx tsx artifacts/catalog-demos/theatre-production-silhouette-20261106/render_variants.ts --views
    python3 artifacts/catalog-demos/theatre-production-silhouette-20261106/capture_demo.py
    python3 scripts/checkCatalogQuality.py --kit theatre-production
    npx eslint catalog/kits/theatre-production/
    npx vitest run tests/integration/catalog/

Do not re-run `artifacts/catalog-demos/theatre-production-wave-20261103/generate_theatre_assets.py`. It rewrites every theatre source from the original single-colour wave.

The branch is not deployed. These are stylized scene props. They do not claim vendor dimensions, photometrics, beam angles, or hoist working-load or rigging-safety ratings.

## Untracked generated outputs

`frames/` is not tracked in git; it is regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/theatre-production-silhouette-20261106/capture_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
