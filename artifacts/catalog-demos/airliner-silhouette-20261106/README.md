# Airfield jet silhouette rebuild — 2026-11-06

**Demo:** [42-second before/after, orthographic check and variant walkthrough](airliner-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 40 airfield assets already passed the quality gate. The five jets were still one template, though: a sphere stretched into a needle for the fuselage, a flat six-point slab for each wing (it read as a backward arrowhead), a box for the fin and squashed spheres for engines that did not show. They rendered at 340–458 triangles and looked nearly identical. The private jet's description promised rear-mounted engines, but they hung under the wing.

This round rebuilt all five around shared loft helpers:
- the fuselage is lofted through nose, parallel-barrel and upswept tail-cone stations;
- wings and tailplanes are lofted through root/kink/tip airfoil sections along the span, with sweep and dihedral;
- the fin and winglets are lofted up Z;
- nacelles are lofted rings with a cut intake and a dark fan face.

No kit or asset IDs were added, and these edits are not counted as promotions from thin assets.

## Results

- **Narrowbody airliner** (A320/737 class): drooped nose with wraparound cockpit glass, cabin window band and cheatline. It has a kinked swept wing with dihedral and a bare-metal slat strip, two turbofans on pylons forward of the wing, a tall swept livery fin, a low tailplane and dual-wheel gear. Shape choices: `variant` `short | standard | stretch` (1,110 / 1,250 / 1,470 mm, with the wing kept at the same fraction of length) and `wingtips` `sharklets | fences`.
- **Widebody airliner:** fuselage 172 mm across against the narrowbody's 132. Long 37° swept wing, very tall fin. Default is a quad jumbo with an upper-deck hump, cockpit glass and upper-deck windows on the hump, and four 4-wheel bogies (2 wing, 2 body). Shape choices: `engines` `quad | twin` (twin fits two very large fans and 6-wheel bogies) and `upperDeck` `hump | none`.
- **Regional jet:** slim 102 mm fuselage on short gear, with blended winglets. Shape choices: `engineMount` `underwing | rear`; rear puts pods on the aft fuselage, moves the wing back and switches to a T-tail. Also `wingtips` `winglets | plain`.
- **Private jet:** long pointed nose and long tail cone, seven separate cabin windows per side instead of a band, and a clean wing with tall winglets. Engine pods now really sit on the aft fuselage, with thrust-reverser rings, under a swept T-tail with a bullet fairing. Shape choices: `tail` `t-tail | cruciform` and `wingtips` `winglets | plain`.
- **Cargo aircraft** (strategic airlifter): broad, low-slung fuselage with a blunt nose and a hard rear upsweep. It has an anhedral shoulder wing with a crown fairing and winglets, a T-tail, and blister gear sponsons with three tandem wheel pairs a side. Shape choices: `propulsion` `turbofan | turboprop` (eight-blade propellers) and `ramp` `closed | open`. Open cuts the hold, adds a dark hold ceiling and lowers the ramp to the apron.
- **Colour controls:** each jet keeps its four existing knobs (`airframePaint`, `canopyGlass`, `bareMetal`, `rubber`), so saved scenes keep working, and adds **`liveryPaint`**: fin, nacelles/pods, cheatline and winglets; on the cargo aircraft, fin, nacelles and sponsons. Each jet has its own default livery: navy, red, green, champagne, military grey. `canopyGlass` now defaults to dark cockpit and cabin glass rather than pale teal. Labels say which parts each knob drives. The `weathered` and `highVisibility` presets set all five materials.
- **Shape choices:** **+10** (two per jet).
- **Triangles** (defaults): narrowbody **2,080**, widebody **3,132**, regional **2,080**, private **2,492**, cargo **2,812**; they were 340 / 402 / 340 / 340 / 458. Budgets were raised from 1,800 to 2,400 (narrowbody, regional), 2,800 (private jet: the discrete windows) and 3,200 (widebody, cargo). Measured variants are in [variant-renders.json](variant-renders.json). Not every option combination was measured.
- **Proportions:** lengths stay close to the old assets so scene placements still fit. Span, diameter, fin height, gear track and wheel size come from each type's real proportions at that length. The widebody was lengthened from 1,550 to 1,900 mm so its fuselage is visibly wider than the narrowbody's.
- **Gates:** [kit](quality-kit-output.txt) 40/40, [global](quality-global-output.txt) 2390/2390. [ESLint](eslint-output.txt) is clean, the [index build](catalog-build-output.txt) succeeded, and [catalog integration](catalog-integration-output.txt) passed 15/15. That run includes the base-origin (`minUp = 0`), triangle-budget, fresh-index and knob-listing checks.

[before/](before/) keeps the original sources and preview bytes. [variants/](variants/) holds the default, shape-choice, weathered and highVisibility renders, and [views/](views/) the top, side, front and rear three-quarter check renders. All are made from the same sources.

The five sources are now hand-authored and share an identical helper block. `generate_airfield_assets.py` (airfield wave) and `promote_airfield_quality.py --apply` would overwrite them with the old geometry, so do not re-run either for these IDs.

## Reproduce

From the repository root:

    npx tsx scripts/renderCatalogPreviews.ts narrowbody-airliner widebody-airliner regional-jet private-jet cargo-aircraft
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/airliner-silhouette-20261106/render_airliner_variants.ts
    npx tsx artifacts/catalog-demos/airliner-silhouette-20261106/render_airliner_variants.ts --views
    python3 artifacts/catalog-demos/airliner-silhouette-20261106/capture_airliner_demo.py
    python3 scripts/checkCatalogQuality.py --kit airfield
    npx eslint catalog/kits/airfield/
    npx vitest run tests/integration/catalog/

Dated comparable product-form research is kept private. The branch is not deployed. These are stylized scene props. They do not claim airworthiness, aerodynamic accuracy, type certification or exact proportions for any named aircraft.

## Untracked generated outputs

`frames/` is not tracked in git; it is regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/airliner-silhouette-20261106/capture_airliner_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
