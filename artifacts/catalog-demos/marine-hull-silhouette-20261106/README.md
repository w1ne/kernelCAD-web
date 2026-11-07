# Marine vessel hull silhouette refinement — 2026-11-06

**Demo:** [24-second before/after and variant walkthrough](marine-hull-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 40 marine assets already passed the quality gate, but the three working vessels were still one extruded plan-view polygon with boxes stacked on it. Every surface was dark slate, and they rendered in 100–144 triangles. This round rebuilt the cargo ship, motorboat and fishing boat around a hull lofted through transom, midbody, bow and stem stations (`path()` sections mirrored port/starboard, `loft()` along X). Each hull has a contrasting bottom below the waterline. No kit or asset IDs were added, and these edits are not counted as promotions from thin assets.

## Results

- **Cargo ship (container feeder):** a lofted hull with parallel midbody, a raked stem with bulbous bow, and red antifouling below the waterline under navy topsides. It has a red-oxide weather deck, a raised forecastle and foremast, and eight hatch coamings. Aft are a stepped white accommodation block, bridge deck with wings and a window band, a radar mast, and a tapered funnel with a coloured band. Mixed-colour container stacks sit four rows wide. The ship was lengthened from L/B ≈ 2.9 to ≈ 3.9 so it no longer reads as a barge. Shape choices: deck load `full | partial | empty`, gear `gearless | cranes` (two centreline deck cranes with raised jibs).
- **Motorboat (centre-console runabout):** a deep-V planing hull from a wide transom to a raked, rising bow. The cockpit is cut into the hull (`subtract`), so it is a real open boat with side decks and a transom. It has a white gelcoat bottom and foredeck cap over painted topsides, a console with a raked front, windscreen, wheel and grab rail, a leaning post, a stainless bow rail on stanchions with a pulpit, and a transom-hung outboard (cowling, leg, cavitation plate, skeg, prop). Shape choices: outboards `single | twin`, canopy `open | t-top`.
- **Fishing boat (inshore trawler):** a full displacement hull lofted to a high, flared bow. The bulwarked working deck is cut into the hull and has a red deck, a white bulwark cap and a rubbing strake. The wheelhouse has a raked front, window band, overhanging roof, and a mast with radar and light. Shape choices: gear `trawl | pots` (stern A-frame gantry with sheaves, net drum and trawl doors, or stacked creels with a davit pot hauler) and wheelhouse `forward | aft`.
- **Colour controls:** each asset still has four material controls, now assigned so that each one is visible:
  - cargo ship: `paintedHull`, `antifouling`, `superstructurePaint`, `cargoCoating`. These replace `nonskidCoating` and `stainlessSteel`, which had no visible role. The container stacks use all four paints, as a real mixed load would.
  - motorboat: `paintedHull`, `gelcoat`, `marineGlass`, `stainlessSteel`. `gelcoat` replaces `nonskidCoating`.
  - fishing boat: `paintedHull`, `antifouling`, `cabinPaint`, `marineGlass`. These replace `nonskidCoating` and `stainlessSteel`.

  Saved scenes that set the removed knob names will fall back to defaults. The `weathered` and `highVisibility` presets now set every material.
- **Shape choices:** **+6** (two per asset).
- **Triangles:** default cargo ship **1,662**, motorboat **1,184**, fishing boat **838** (were 136 / 100 / 144). Budgets were raised from 1,800 to 2,400. Measured variants are in [variant-renders.json](variant-renders.json). Not every option combination was measured.
- **Gates:** [kit](quality-kit-output.txt) 40/40, [global](quality-global-output.txt) 2390/2390. ESLint, index build and catalog integration outputs are in the files beside this README. The first integration run failed because the proud bottom lofts dipped 3–4 mm below z = 0, which breaks the base-origin rule. The keels are now clamped to z = 0, and the recorded output is the re-run.

[before/](before/) keeps the original sources and preview bytes. [variants/](variants/) holds the default, shape-choice, weathered and highVisibility renders, all made from the same source.

The three sources are now hand-authored. `artifacts/catalog-demos/marine-wave-20261102/generate_marine_assets.py` would overwrite them with the old slab geometry, so do not re-run it for these IDs.

## Reproduce

From the repository root:

    npx tsx scripts/renderCatalogPreviews.ts cargo-ship motorboat fishing-boat
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/marine-hull-silhouette-20261106/render_marine_hull_variants.ts
    python3 artifacts/catalog-demos/marine-hull-silhouette-20261106/capture_marine_hull_demo.py
    python3 scripts/checkCatalogQuality.py --kit marine
    npx eslint catalog/kits/marine/
    npx vitest run tests/integration/catalog/

Dated comparable product-form research is kept private. The branch is not deployed. These are stylized scene props: no seaworthiness, stability, hull form accuracy or cargo capacity is claimed.
