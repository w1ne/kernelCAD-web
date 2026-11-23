# Vet-clinic muzzle, carrier, bowl rail, step stool and cooler silhouette rebuild — 2026-11-06

**Demo:** [before/after, orthographic check and variant walkthrough](vet-clinic-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 50 vet-clinic assets already passed the quality gate, but the kit was built entirely from a shared `b()`/`c()` box-and-cylinder helper: 0.7 curved or profiled calls per asset, the lowest of any kit. Five assets did not read as their object from the preview:

- **basket muzzle:** a 330 mm rectangular box frame with two slanted rails;
- **hard-sided pet carrier:** a closed box with three bars on the front;
- **kennel feeding bowl rail:** a wall slab with three solid pucks for bowls;
- **exam step stool:** two stacked slabs between solid side panels;
- **specimen transport cooler:** a box with a box lid and box handle.

This round rebuilt those five from lofted rounded-rectangle shells, elliptical band hoops, a revolved hollow bowl profile, boolean recesses and polygon rods. No kit or asset IDs were added, and these edits are not counted as promotions from thin assets.

## Results

- **Basket muzzle:** now real size for a medium dog, about 160 mm across. A tapered moulded cage with a wide rear rim, two waist hoops and a nose ring, joined by twelve rails, and a cross grille over the nose. A neoprene bridge pad lines the top of the rear rim, and a chin bumper sits underneath. Behind it are a nylon neck-strap loop with side straps, D-rings and a steel buckle. Shape choice: `forehead` `strap | none`.
- **Hard-sided pet carrier:** an airline-style crate. A deep base tray and a tapered top shell clamp together at a lipped seam with four wing nuts. The top shell has six vent slots cut into each side and an arched handle on two mounts. A doorway recess is cut into the front and closed by a chromed wire door: frame, nine uprights, two cross wires, a hinge pin and a squeeze latch. Shape choice: `size` `small | medium | large` (0.82/0.8/0.82 and 1.18/1.22/1.2 of the 390 × 580 × 370 mm medium crate). The previews auto-frame, so the size renders look alike; the exported size changes.
- **Kennel feeding bowl rail:** two slotted uprights on floor plates with rubber feet, clamps with pins, and a folded rail plate. Each bowl is a hollow revolved stainless dish with a flared wall and a rolled rim, sitting in a wire holder ring on two arms. Shape choice: `bowls` `two | three | four`.
- **Exam step stool:** two raked tubular side frames on rubber feet, a low front tread and a higher rear tread, and three cross braces. Each tread is a stainless pan with a front skirt, a ribbed rubber mat and an anti-slip nosing strip. Shape choice: `handrail` `rail | none`.
- **Specimen transport cooler:** about 20 L. A rounded body tapers towards four rubber feet and has grip pockets cut into both ends. A domed contrasting lid sits on a rubber gasket and is held by two draw latches. A recessed temperature display is set into the front. Shape choice: `carry` `bail | strap` (swing bail with rubber grip, or shoulder strap).
- **Colour controls:** each asset has four material knobs. Existing knob names are kept so scenes that set them still work. Added: muzzle `paddingColor`, carrier `baseColor`, bowl rail `holderColor` and `rubberColor`, stool `nosingColor`, cooler `lidColor`. The cooler drops `stainlessSteelColor`: it has no steel parts, and its pivots and bail are moulded lid plastic. Existing preset names (`clinicClean`, `softTeal`) are kept, and they now set every knob.
- **Shape choices:** +5 in total (one per asset).
- **Triangles** (default / variants → budget): muzzle 1,260 / 1,184 → 1,600; carrier 1,060 (all sizes) → 1,400; bowl rail 1,632 / 1,260 two / 2,004 four → 2,400; stool 864 / 724 → 1,200; cooler 744 / 620 → 1,000. All five were 1,800 before. Measured values are in [variant-render-output.txt](variant-render-output.txt) and [variant-renders.json](variant-renders.json).
- **Scale change:** the muzzle is now real size rather than about twice oversized, and the cooler shrinks from 694 × 478 × 627 mm to 470 × 325 × 437 mm (width × depth × height, with the bail). Scenes that placed them will see them shrink.
- **Ground contact:** each asset rests on a flat-bottomed part at z = 0 (chin bumper, base tray, floor-plate feet, rubber feet). The catalog test's `minUpM = 0` check passes.
- **Gates:** [kit](quality-kit-output.txt) 50/50 and [global](quality-global-output.txt) 2390/2390. [ESLint](eslint-output.txt) is clean, the [index build](catalog-build-output.txt) succeeded with only these five rows changed, and [catalog integration](catalog-integration-output.txt) passed 15/15.

[before/](before/) keeps the original sources and preview bytes. [variants/](variants/) holds the default, shape-choice and preset renders. [views/](views/) holds front, side, top and rear three-quarter check renders. All of them are made from the same sources.

## Reproduce

From the repository root:

    npx tsx artifacts/catalog-demos/vet-clinic-silhouette-20261106/check_assets.ts basket-muzzle hard-sided-pet-carrier kennel-bowl-rail exam-step-stool specimen-transport-cooler
    npx tsx scripts/renderCatalogPreviews.ts basket-muzzle hard-sided-pet-carrier kennel-bowl-rail exam-step-stool specimen-transport-cooler
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/vet-clinic-silhouette-20261106/render_vet_variants.ts
    npx tsx artifacts/catalog-demos/vet-clinic-silhouette-20261106/render_vet_variants.ts --views
    python3 artifacts/catalog-demos/vet-clinic-silhouette-20261106/capture_vet_demo.py
    python3 scripts/checkCatalogQuality.py --kit vet-clinic
    npx eslint catalog/kits/vet-clinic/
    npx vitest run tests/integration/catalog/

The branch is not deployed. These are stylized scene props. They are not veterinary equipment specifications or animal-handling guidance.

## Untracked generated outputs

`frames/` is not tracked in git; it is regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/vet-clinic-silhouette-20261106/capture_vet_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
