# Wind-energy transport and access silhouette refinement — 2026-11-06

**Demo:** [24-second before/after and variant walkthrough](wind-transport-silhouette-refinement.mp4) · [poster](poster.png) · [sampled frames](video-review/)

All 50 wind-energy assets already passed the quality gate, but 16 of them were still a handful of axis-aligned boxes with a 300-triangle budget. This round rebuilt the three that read worst in their previews: the blade transport saddle (72 triangles: two black blocks on a plate), the nacelle transport frame (84: four posts and two yellow bars) and the service lift cage (96: an open box frame with a yellow panel). They now use extruded `path()` profiles, `loft()` and `revolve()`. No kit or asset IDs were added, and these edits are not counted as promotions from thin assets.

## Results

- **Blade transport saddle:** I-beam cross bearers, channel side rails and lashing lugs carry twin web plates whose top edges follow the underside of the blade. A steel cradle shell and elastomer liner sit on the plates, and two ratchet straps with buckles go over a 1.2 m blade stub. You can choose a cambered airfoil (mid-span) or a round root for the cradle profile, and the saddle can be strapped or empty. Default **884 / 1,800** triangles (root, empty 488).
- **Nacelle transport frame:** twin I-beam main girders, four cross bearers and X-bracing in the rear bay. A deck plate carries a raised yaw-adapter flange ring (revolved) with a 16-bolt circle. Each corner has a painted lifting lug with a bow shackle and an end band. It stands on ground skids or A-shaped storage trestles, and you can load it with a lofted nacelle body (main-shaft flange, roof cooler, met mast) or leave it empty. Default **1,968 / 2,400** triangles (empty on trestles 1,812).
- **Service lift cage:** welded wire-mesh cage with a yellow obstruction plate under the floor and a sliding mesh door on a top track. On the roof are an escape hatch, a traction hoist (gearbox, motor, fan cover and revolved sheave), an arrest device, and the hoist and safety wire ropes running up from it. Inside is a control box. The cage is guided either by side guide wires through roller brackets or by trolleys on a tower ladder, and the door can be closed or open. Default **1,388 / 2,400** triangles (ladder-guided, door open 1,896).
- **Colour controls:** each asset went from 2 to 4 material colour controls, **+6 in total**: strap webbing and blade composite; galvanized hardware and nacelle composite; drive unit and wire rope. The existing `weathered` and `highVisibility` presets now set every material.
- **Shape choices:** **+6**: cradle profile, load, frame load, support, guide system and door.
- **Triangle budgets:** raised from 300 to 1,800, 2,400 and 2,400. The values above come from the measured renders in [variant-renders.json](variant-renders.json). Not every option combination was measured.
- **Quality gate:** colour materials are now applied through one helper per material (`steel(...)`, `liner(...)`, …), so each colour knob appears in its own `.color(<material>)` call and `scripts/checkCatalogQuality.py` counts it. Gate results: [kit](quality-kit-output.txt) 50/50, [global](quality-global-output.txt) 2390/2390. ESLint, index build and catalog integration outputs are in the files beside this README.

[before/](before/) keeps the original source and preview bytes. [variants/](variants/) holds default, shape-choice, weathered and highVisibility renders made from the same source.

## Reproduce

From the repository root:

    npx tsx scripts/renderCatalogPreviews.ts blade-transport-saddle nacelle-transport-frame service-lift-cage
    npx tsx scripts/buildAssetCatalog.ts
    npx tsx artifacts/catalog-demos/wind-transport-silhouette-20261106/render_wind_transport_variants.ts
    python3 artifacts/catalog-demos/wind-transport-silhouette-20261106/capture_wind_transport_demo.py
    python3 scripts/checkCatalogQuality.py --kit wind-energy
    npx eslint catalog/kits/wind-energy/
    npx vitest run tests/integration/catalog/

Dated comparable product-form research is kept private. The branch is not deployed. These are stylized scene props: no load rating, lifting certification, blade or nacelle fit, or lift performance is claimed.
