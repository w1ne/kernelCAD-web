# pocket-watch-v2 — iteration log

Each entry: the focused change + side-by-side diff against `/tmp/refcrop/watch_close.png`.

## iter 0 — initial vision-driven blockout

**What changed vs the v0.7 pocket-watch build:**
- Body downsized to ~22 mm flat-to-flat (was ~50 mm tip-to-tip).
- Frame extended above the case as a sculpted *trapezoidal horn* + flat *tab*, both fillet-fused with the case to read as one continuous pink body.
- Crown moved to the +X SIDE of the horn (hex prism, axis along X), not the top axis.
- Bail authored as a revolved torus with the through-hole facing the camera.
- Crystal shipped as a flatter NURBS dome with glass material (transmission 0.95, ior 1.5).
- Strap reduced to a short stub above the bail.

**Render:** `/tmp/pwv2_iter0_iso.pose-30-15.png`

**Diff against the reference:**

| What | Status |
|---|---|
| Octagonal pink frame | OK shape, but rendered colour is too dark and saturated — reads as oxblood, not coral |
| Yellow inner case + 8 black hex screws | OK |
| Pink horn + tab on top, integrated with case | Geometry there, but the strap visually overpowers it |
| Bail visible as a through-hole ring at the iso pose | OK |
| Strap | A floating thick rectangle ABOVE the bail (looks disconnected from the body); composition jams the watch to the right because the strap stretches the bbox vertically |
| Crown on the side, yellow knurled | Visible but reads as a tiny yellow cube — not knurled |
| Dome crystal — dial visible through glass | Dome barely visible at this pose; dial reads as opaque |
| Sub-dial + tapisserie | Hard to see in the iso pose; would need front view to inspect |

**3 worst issues, ranked:**
1. Frame colour rendering as dark oxblood rather than the bright coral pink of the reference — single-pixel sample suggests the material's `metalness/clearcoat` defaults are darkening the base colour. Need to either use `.material({ baseColor, metalness: 0, roughness: 0.6 })` explicitly or pick a brighter `#`.
2. Strap floats above the bail like a tongue depressor. The reference shows the strap *wrapping through* the bail and folding back. For now, dropping the strap entirely will give the body room to breathe and centre the composition.
3. Crystal dome reads as opaque from this pose. The transmission material needs the HDRI environment to be present at render time; without it the glass falls back to the diffuse base colour.

**Decision:** commit and continue. Drop the strap next, brighten the frame colour, and address the crystal in iter 2.

## iter 1 — drop the strap, push materials to leaves

**What changed:**
- Strap removed entirely (was stretching the bbox vertically and pushing the watch into the bottom-right corner).
- `.material()` calls moved from post-boolean (which is a no-op per kernelcad-authoring rule) to leaf primitives that the renderer's lookupSourceMaterial walks back through. Coral pink, mustard yellow, bright teal applied where they count.

**Render:** `iter-1.png`

**Diff against the reference:**
- Frame colour STILL rendering dark. Either `lookupSourceMaterial` isn't reaching the leaf, or PR #254's renderer is using lookupSourceColor first and color-fallback overrides.
- Bail clearly visible as a through-hole ring (good).
- Yellow case + 8 black hex screws + the bezel insets are clean.
- Dial detail (tapisserie waffle + numerals + subdial + hands) shows clearly from both the iso pose and the front view — this is a real win vs the v0.7 baseline which had the dome occluding too much.
- The horn and tab geometry is technically present but reads as a tiny pink nub between the case top and the floating bail — there's a 2-3 mm vertical gap between the horn top and the bail bottom, so the pendant looks disconnected.
- Crown is still a tiny yellow cube — the hex pattern doesn't read at this resolution.
- The composition is STILL jammed to the right because the bail sits ~8 mm above the case top, stretching the bbox.

**3 worst issues, ranked:**
1. Bail floats — pendant stack (horn + tab) is too short to bridge the case-top to the bail. Either collapse the bail down to the tab top, OR thicken the tab so it visibly bridges.
2. Frame colour still dark. Need to investigate whether leaf-material survives the union/subtract or whether the legacy `.color()` path overrides PBR.
3. The bbox-driven camera framing keeps right-jamming the watch. Need to either tighten the model vertically OR set an explicit camera in the build.

**Decision:** commit, then iter 2 collapses the bail down ONTO the tab top so the pendant reads as one continuous mass.

## iter 2 — switch pendant from extrudePolygon trapezoid to a centred box

**What changed:**
- Diagnosed that `extrudePolygon([XZ_pts], depth).rotate([1,0,0],-90).translate(0,-depth/2,0)` produces a prism centred at world Y = -depth (the v0.7 code's comment misdescribes the rotation), so the trapezoid horn was floating at world_Y far in front of the case in front-view and invisible. The case octagon "happens to look centred" because the iso camera centroids the whole scene.
- Replaced the trapezoid horn with a centred `box(W, D, H, true).translate(0, 0, Z_center)` — predictable placement. Lost the taper but gained a horn that ACTUALLY appears between the case top and the bail.
- Bail center pushed up to clear the new taller horn.
- Crown re-anchored to the box's +X face.
- Brighter `#f59ba1` coral pink (was `#ec7a83`).

**Render:** `iter-2.png`

**Diff against the reference:**
- Pendant is finally a CONTINUOUS chunk of pink rising from the case to the bail — no floating bail, no Mickey-Mouse-ear effect. This is the biggest single improvement so far.
- Coral colour is brighter, closer to reference's coral but still slightly desaturated.
- Bail still has a 1-2 mm visible gap above the horn (need to set BAIL_CENTER_Z so the tube outer surface kisses the horn top).
- Composition is more centred than iter 1 (the bail is no longer 15 mm above the case top).
- Horn is a UNIFORM rectangle, while the reference shows a clearly tapered neck. Future iteration: chamfer or fillet the top corners.
- Crystal dome visible but quite subtle from the iso pose.
- Crown is finally readable as a hex prism on the horn face.

**3 worst issues, ranked:**
1. Horn is too RECTANGULAR — reference has a sculpted taper toward the bail.
2. Small visible air gap between horn top and bail bottom.
3. Composition still slightly right-biased (the bail above the body adds 5+ mm of bbox vertical that the symmetric body doesn't have).

**Decision:** commit, then iter 3 chamfers the horn's top corners to give it a tapered "neck" look.
