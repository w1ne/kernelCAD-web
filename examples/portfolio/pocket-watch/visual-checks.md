# Pocket-watch visual gates — v6 pass

Source: `build.kcad.ts` (Features: 327, OK; interferences: 0 pairs / 96 parts; measured by `kernelcad interference`).

| Gate | Pass? | Evidence |
|------|-------|----------|
| G1 — NURBS crystal spans the dial (≥ 80% of dial radius) | yes (measured) | `DOME_HALF = DIAL_RADIUS * 1.05` = 12.6 mm; ratio = 105% of the 12 mm dial radius. Dome footprint slightly overlaps the bezel rim, matching how real pocket-watch crystals are seated. |
| G2 — Pink frame visible on BOTH front and back faces of yellow case | yes (subjective — see hero-frame.png / right view) | `FRAME_DEPTH = 9.0` vs `CASE_DEPTH = 8.0`; case (Y ∈ [-4, +4]) is fully enveloped by frame (Y ∈ [-4.5, +4.5]). Right view shows pure pink silhouette; iso shows pink frame wrapping the yellow case in depth. |
| G3 — Crystal reads as a DOME (curvature visible), not a flat slab | yes (subjective — see iso view) | Periodic-V NURBS dome with bell-curve rise = 3.0 mm over a 12.6 mm radius footprint. Highlight + rim curvature visible in iso. |
| G4 — Numerals 12, 6, 9 readable on dial | yes (subjective — see front view) | `NUMERAL_RADIUS = 8.0` mm sits inside the dial (12 mm) and well inside the dome footprint (12.6 mm). With v0.8 PBR transmission on the crystal, the numerals are visible THROUGH the dome rather than alongside it. |
| G5 — All 8 hex screws visible at octagon vertices | yes (subjective — see front view) | Eight black hexagonal screw heads at all eight bezel-octagon vertices. |
| G6 — Crystal renders as glass (dial + numerals + hands legible through it) | yes (subjective — see front + iso) | `.material({ transmission: 0.95, ior: 1.76, roughness: 0.04, clearcoat: 0.4 })` — sapphire IOR, low roughness. Renderer now propagates PBR materials through the assembly fan-out (`lookupSourceMaterial`) and routes transmissive materials through the three.js transmission pass with PMREM env map for IBL. Visible result: dial + tapisserie + numerals + hands all readable behind the dome. |
| G7 — Lanyard loop reads as a closed ring a chain could pass through | yes (subjective — see front view) | Built as a `torus(majorR=5, minorR=1.2)` rotated so its axis is world-Y; the hole opens along ±Y so the camera (looking from -Y) sees the circular through-hole directly. A short pink bail post bridges the gap between the frame top and the torus base. |
| G8 — Front view reads instantly as a "pocket watch" matching the reference photo | yes (subjective — see hero-frame.png) | Pink octagonal frame, yellow octagonal case, teal dial with numerals + hands + subdial, transparent dome crystal, bail loop + crown at top. |
| G9 — Zero BREP interferences | yes (measured) | `kernelcad interference build.kcad.ts` reports: "No interferences detected (96 parts, 260 comparisons, ε=0.01mm³)." |

## Iteration log

1. **v1** — DOME_HALF = DIAL_RADIUS + 0.8, square 5×5 NURBS control grid. Dome rendered as a square slab; G3 failed.
2. **v2** — Switched to polar control grid (radial × angular). Dome circular but had a visible seam wedge at angle = 0; G3 failed.
3. **v3** — Increased angular resolution to N = 12. Seam smaller but still visible; G3 failed.
4. **v4** — Added explicit `periodic: { u: false, v: true }` with periodic V knot vector. Seam closed; G1/G3/G5/G7 pass but opaque dome buried the numerals; G4 failed.
5. **v5** — Shrunk `DOME_HALF` to 0.83 × DIAL_RADIUS and moved numerals OUTSIDE the dome rim. All gates pass but lens reads as a small opaque disc, not a domed glass crystal, and the lanyard loop was an extruded 2D arch silhouette ("a bow") that reads as a flat blade with no chain-passable hole. User rejected: *"lens is shit, not transparent, and small"* + *"the top mount is strange"*.
6. **v6 (current)** —
   - Crystal: replaced `.color('#dfeef4')` with v0.8 `.material({ transmission: 0.95, ior: 1.76, roughness: 0.04, clearcoat: 0.4 })`. Dome enlarged to `DOME_HALF = DIAL_RADIUS * 1.05` (rim 5% past dial radius, as on a real crystal). Numerals moved INWARD to `NUMERAL_RADIUS = 8.0` mm so they sit under the dome and read through the glass.
   - Lanyard loop: replaced the extruded arch silhouette with a `torus(majorR=5, minorR=1.2)` rotated so its axis is world-Y (through-hole faces the camera). Subtracted the lower halfspace at `z < LOOP_BASE_Z` so the cut produces clean semi-tube cross-sections. Added a short pink "bail post" cylinder bridging the frame top to the torus tube — needed because lifting the torus above the crown knob otherwise leaves the loop floating.
   - Renderer wiring fixes uncovered during v6 (the existing API documented transmission in `SKILL.md` but no demo had exercised it before): added `lookupSourceMaterial` helper (peer to `lookupSourceColor`) so `Shape.material()` set on the source of `assembly.part(name, shape)` survives the SceneBackend fan-out; extended `SceneBackendPart` to carry `material?: PBRMaterial`; threaded the material through `featureMeshing.ts`'s SceneBackend path; added a PMREM RoomEnvironment-based `scene.environment` in `ViewerPane.tsx` so MeshPhysicalMaterial transmission has an IBL to sample; flipped the `forceFullOpacity` and `buildMeshFromFace` paths so transmissive materials keep `transparent: true` + `FrontSide` (DoubleSide produces self-occlusion artifacts in the transmission render pass).
   - Interference: zero pairs at ε = 0.01 mm³ (`kernelcad interference`).
