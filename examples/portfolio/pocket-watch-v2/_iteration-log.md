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

## iter 3 — stacked horn (shoulders + neck) + bail kisses horn

**What changed:**
- Horn split into TWO stacked boxes: wider lower "shoulders" + narrower upper "neck". Reads as a stepped taper, much closer to the reference's sculpted pendant than iter 2's plain rectangle. (Tried a single box with diagonal corner cutters first — produced a U-shaped tuning-fork; reverted.)
- Bail's BAIL_CENTER_Z reduced to (HORN_TOP_Z + clearance) so the tube outer rim touches the horn top with ~0.03 mm air gap (interference-free, visually fused).
- Crown moved to the upper-narrow horn's +X face and pushed 0.6 mm outboard so the hex prism's bbox clears the horn without interference.
- Overall horn height tightened (HORN_TOP_Z from 18.0 → 15.5) — composition is less stretched vertically.

**Render:** `iter-3.png`

**Diff against the reference:**
- Stacked pendant reads as "shoulders + neck" — closer to reference's sculpted horn.
- Bail-horn junction is clean (no visible gap).
- Crown is unambiguously a hex prism on the side of the pendant.
- Coral pink reads brighter than iter 1; still slightly more muted than the reference's saturated coral.
- Dial (12, 9, hands, tapisserie, subdial) visible through the dome.
- Composition still right-biased — the pendant column above the case stretches the bbox.

**3 worst issues, ranked:**
1. The horn's stacked transition is a HARD STEP (a visible right-angle ledge where lower meets upper). Reference has a smooth fillet at this transition. Need a fillet or a smoother profile.
2. The horn's lower box has square corners on its TOP (where it meets the upper box) — the inside corners look a bit awkward.
3. Composition still right-biased — the camera fitter sees the bail high above the body and frames around the whole column.

**Decision:** commit, then iter 4 tries to fillet the horn step. If fillet fails (OCCT often refuses high-curvature unions), fall back to an extra mid-section box.

## iter 4 — three-step pendant (smoother taper)

**What changed:**
- Horn now stacks THREE boxes: wide lower shoulders + medium mid + narrow upper finial. Each step also tapers in Y (depth) by 5% — wider depth at the base, narrower toward the bail.
- Tried `.fillet(0.4)` on the union to smooth the step edges — OCCT refused (non-G1 union seam, known limitation). Reverted; the stepped look is left in.
- Crown stays on the upper side; its X is computed against the LOWER horn's width because the hex prism's bbox in Z reaches DOWN into the lower-horn Z range.

**Render:** `iter-4.png`

**Diff against the reference:**
- Three-step pendant reads as a gradual taper, much closer to the reference than iter 3's two-step.
- The transitions are still HARD STEPS (visible right-angle ledges at each step) rather than a smooth curve. The reference has a smooth fillet at every transition.
- Composition is still right-jammed.
- Crystal, dial, hands, subdial readable. Frame colour acceptable but could be slightly more saturated.

**3 worst issues, ranked:**
1. Stepped transitions still read as "tiered cake" / "stairs" rather than a sculpted taper. A smooth profile would need a loft or a sweep along a curved rail.
2. Composition right-bias persists.
3. Material rendering reads slightly desaturated vs the reference's coral.

**Decision:** commit. Try a `loft` between the lower and upper trapezoid profiles for iter 5 — that's the kernelCAD-native way to get a smooth taper.

## iter 5 — lofted pendant (smooth taper)

**What changed:**
- Replaced the three stacked boxes with a `path().loft(other)` between two rectangular sections: a wide-deep section at the case top and a narrow-shallow section at the bail. Loft engine produces a continuous taper — no visible steps.
- Horn base sunk into the frame's top corner Z so the loft fuses cleanly with the octagon.
- Crown placement formulas kept the old HORN_LOWER/MID/UPPER variables for stability.

**Render:** `iter-5.png`

**Diff against the reference:**
- Pendant taper is now SMOOTH — looks like one sculpted block, not a tiered cake. This reads MUCH closer to the reference than iter 4's three-step.
- BUT there's a visible step at the horn-base / frame-top junction. The loft creates the horn as its own primitive, then it unions with the frame; the union seam shows a hard right-angle ledge where the loft's bottom face meets the frame octagon's top flat. Reference has a smooth fillet there.
- Composition still right-biased.
- Crystal + dial + crown + bail all clean.

**3 worst issues, ranked:**
1. The visible horn-base ledge breaks the "one-continuous-body" illusion at the horn / frame junction.
2. Composition still right-biased. The pendant column is ~50% of total vertical extent.
3. Frame coral colour reads slightly muted vs the reference's saturated pop-art coral.

**Decision:** commit. Iter 6 widens the horn's BASE section so it matches the frame's top-flat width — that may visually hide the union ledge, since the horn-base and frame-top will share the same X edge.

## iter 6 — horn base = frame top flat (seam invisible)

**What changed:**
- HORN_BASE_W_X set to `2 * FRAME_FLAT * tan(π/8)` (~9.1 mm), exactly matching the frame octagon's top-flat width.
- HORN_DEPTH_Y set to FRAME_DEPTH so the horn's bottom face also matches the frame's top-flat depth in Y.
- HORN_BASE_Z pulled to `FRAME_TOP_Z - 0.05` so the horn fuses flush with the frame top.
- Crown placement formula updated to use the LOFTED horn's per-Z linear width (interpolated between BASE and TOP at the crown's Z).
- Crown's Z-extent (±1.1 mm of hex) accounted for: clearance computed against horn width at crown's BOTTOM rim, not centerline.

**Render:** `iter-6.png`

**Diff against the reference:**
- The pendant now reads as ONE CONTINUOUS body with the frame — the union seam at the horn base is invisible because the horn's bottom face matches the frame's top flat exactly.
- Smooth taper from frame top to bail — closest match to the reference's sculpted neck so far.
- Crown is small but unambiguous.
- Bail through-hole reads at the iso pose.
- Composition still right-biased.

**3 worst issues, ranked:**
1. Composition right-bias — bbox-driven camera fitter pushes the watch into the bottom-right corner because the pendant column stretches the bbox vertically.
2. Crystal dome is subtle from the iso pose — the dial is visible but doesn't read as glass.
3. Frame coral colour slightly muted vs reference (less saturated).

**Decision:** commit, then iter 7 tightens vertical extent further AND/OR tries placing a foreground reference image overlay or adjusting the camera.

## iter 7 — crown moved from horn-SIDE to horn-TOP

**What changed:**
- Re-read the reference photo more carefully: the small yellow crown sits at the VERY TOP of the pendant horn (just below the bail), NOT on the side. Earlier iterations placed it on the side.
- Crown axis now along +Z (instead of along +X). Crown sits at HORN_TOP_Z and extends UP by CROWN_LEN.
- Bail moved up by CROWN_LEN so the tube outer surface bottom touches the crown's top face.
- Horn height slightly reduced (HORN_TOP_Z 14.5 → 13.0) and bail dimensions reduced (major 2.0→1.7, tube 0.55→0.45) for a tighter overall composition.

**Render:** `iter-7.png`

**Diff against the reference:**
- The pendant stack now reads as: case → smooth tapered horn → small yellow crown nub → bail. This matches the reference's layout exactly.
- Crown reads as a small yellow hex stub at the top of the pendant.
- Composition LESS right-biased than iter 6 — but still right-biased.
- The crystal is barely visible at this pose (dome is subtle, almost flat against the dial).

**3 worst issues, ranked (and these may be terminal):**
1. **Composition right-bias.** The camera-fitter centres on the bbox centroid, which is biased upward by the pendant. Without a way to set an explicit camera target or pose with a manual offset, this is hard to fully fix in the build script. Possible but invasive: add a balancing invisible part below the watch body. Punting on this.
2. **Crystal dome flat.** The transmission material works but at the iso pose the dome arcs subtly enough that the dial reads as just-painted-on. Need a more pronounced dome OR a stronger material highlight.
3. **Frame coral colour reads slightly muted vs the reference's pop-art saturated coral.** Could push the baseColor further (e.g. `#ff8c93`).

**Decision:** commit. This is likely the convergence point for the geometric story; iter 8 will close out with one last tweak (e.g. brighter pink + slightly bigger dome).

## iter 8 — brighter coral pink + taller dome

**What changed:**
- Coral baseColor pushed from `#f59ba1` to `#ff9aa3` (more saturated coral).
- Crystal CRYSTAL_RISE pushed from 1.5 mm to 2.2 mm so the dome arches more visibly at the iso pose.

**Render:** `iter-8.png` (also copied to `hero-frame.png` as the final).

**Diff against the reference:**
- The watch reads as: smooth tapered pink horn rising from the octagonal case, small yellow crown on top, pink bail above. Dial visible through a slightly-doomed crystal with turquoise tapisserie, yellow numerals + markers, hands, and a pink-ringed subdial.
- Geometric story matches the reference's structure cleanly.
- The CRYSTAL still doesn't read strongly as glass — even with `transmission: 0.95, ior: 1.5, clearcoat: 0.4` and a more pronounced dome, the dial reads as "painted on" rather than "behind glass". This is a renderer limitation as much as a build limitation.
- COMPOSITION still right-biased — the bbox-fitter centres on the pendant-biased centroid. Not solvable in the build script without an explicit camera-target API.

**Honest verdict — converged?**
At this point 4+ iterations have made smaller and smaller deltas. iter 6 → 7 → 8 each fixed a specific issue but the macro composition (right-biased, slightly muted coral, subtle dome) has not budged. The fundamental shape is close to the reference; the remaining gaps are renderer / API gaps:
- **camera target** is bbox-centroid driven, no API to offset
- **glass / transmission rendering** doesn't read strongly without explicit HDRI environment + more dial-side parallax
- **PBR colour calibration** seems to darken `.material()` baseColor in the studio's tone-mapper

I'm calling iter 8 the convergence point for vision-driven agent-CAD with this toolset.

## Polish pass (iter 9–17) — closing the renderer-side gaps

The v2 convergence honest verdict named three renderer / API gaps:
camera target, glass via HDRI, and PBR colour calibration. The
matching renderer-side slices landed shortly after as `setCameraTarget`
(PR #261), `setRenderEnvironment` (PR #256), and NeutralToneMapping
(PR #261). This polish pass picks up the build on top of those APIs.

### iter 9 — baseline on the new renderer base

Same geometry as iter 8, re-rendered on the new base (NeutralToneMapping
already active). Pink already reads brighter without any code change.
Watch still right-biased (cropped to lower right). Crystal still flat.

### iter 10 — HDRI + setCameraTarget

Added `setRenderEnvironment({ preset: 'studio' })` and
`setCameraTarget(0, 0, 0)` at the top of the build script. Crystal
NOW reads as glass — a specular highlight runs along the top edge of
the dome, the dial shows through with slight refraction. Composition
slightly improved but still right-biased.

### iter 11 — full-frame capture (1920×1080) — composition fixed

Diagnosed the persistent right-bias: the ViewerPane internally uses
1920×1080 (1280 viewer + 640 terminal pane) when `?headless=1` is set
on the studio URL. Capturing at `--width 1280 --height 720` gets the
TOP-LEFT 1280×720 of that, putting the watch (at world-origin) into
the right-half of the cropped PNG. Render at `--width 1920 --height
1080` and the watch lands dead-centre. (The `setCameraDistance`
experiments from this iter were a red herring; only the screenshot
crop was broken.)

### iter 12 — rounded multi-section loft for sculpted horn

Replaced the 2-section rectangular `rectSketch` loft with a 3-section
`roundedRectSketch` loft. Each section uses `path.tangentArc` to round
the 4 corners; loft engine sweeps a continuous NURBS-blended surface
between sections. Three sections (base / waist / top) put a 'necking'
pinch ~62% up so the horn reads as a sculpted neck, not a tapered
rectangular block. Closes the v2 verdict's Gap D (rectangular cross-
section shoulders).

### iter 13–14 — taller pendant + pendant-side hex screws

iter 13 added two horizontal hex heads on the pendant's ±X faces (the
reference shows a small dark hex screw at the lower shoulder of the
horn on each side), but the pendant was too stunted (HORN_TOP_Z=13.0,
total horn height ~2 mm) for the screws to read at the right height.
iter 14 bumped HORN_TOP_Z from 13.0 to 17.5 mm so the horn reads as a
proper sculpted neck (about 30% as tall as the body, matching the
reference's proportions), and the screws land at lower-shoulder
height (22% up from the base). Right side screw is visible at iso;
the rotate video reveals both.

### iter 15 — --no-watermark CLI flag

Added a `--no-watermark` flag to `kernelcad render`. Wired through
`headlessRender` → URL param `?nowatermark=1` →
`DemoPlayerPage.noWatermark` → `ViewerPane.noWatermark` prop →
conditional `<Watermark/>` render. Default behaviour unchanged
(studio + tests + captureDemo retain the badge); the flag only
suppresses it on opt-in for clean hero artifacts.

### iter 16 — interference fix (pendant screws cleared horn surface)

The rounded-loft horn's side surface curves outward at the lower
shoulder where the screws sit, so a 0.04 mm outset placed the
`alongAxis`-rotated hex head grazing the surface — two 0.057 mm³ BREP
interferences. Bumped outset to 0.3 mm: zero interferences (96 parts,
272 comparisons).

### iter 17 — tighter pendant waist + slightly flared top

Refined the loft proportions: waist X from 0.85× top-W to 0.72× (a
narrower pinch), waist Y from 0.78× depth to 0.70×, waist Z from 62%
to 65% of height. The vase / hourglass silhouette now reads crisper
at the iso pose, closer to the sculpted-neck profile in the
reference. This is the polish-pass convergence point — `hero-frame.png`
points at this render.

### Polish-pass honest verdict

Matches the reference because:
- Composition centred on the dial (vs prior right-bias)
- Crystal reads as glass with a specular highlight (vs prior flat)
- Pink reads bright + saturated under NeutralToneMapping (vs prior muted)
- Pendant has sculpted hourglass / vase shape via rounded multi-section
  loft (vs prior rectangular taper)
- Eight bezel hex screws + two pendant-side hex screws + small yellow
  crown nub + slim oval bail with visible through-hole all present
- Clean hero artifact (no watermark) for public posts

Still doesn't fully match because:
- Ribbon / strap looping through the bail is omitted (stretches the
  bbox vertically and was excluded from v2 for that reason); the
  setCameraTarget API now CAN handle that, so a future iteration could
  add a stitched ribbon
- The pendant cross-section is still a rounded rectangle, not a true
  ellipse — a 16-control-point NURBS section through `nurbsSurface`
  would close that, at the cost of more boilerplate
- Dial color reads slightly muted under the glass dome (transmission +
  ior tinting); not a build defect — accurate optical behaviour
