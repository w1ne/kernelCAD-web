// Real Object Brief
// Artifact: Ray-Ban Meta smart glasses (Wayfarer variant), front frame body
//   reconstructed from /tmp/ray-ban-stories.jpg.
// Scale: millimetres. Frame envelope ~146 mm wide x 50 mm tall x ~10 mm front-to-back.
//   Lens opening: roughly trapezoidal, ~52 mm wide top, ~46 mm wide bottom, 36 mm tall,
//   with arc-rounded corners (NO sharp 90 degrees anywhere).
//   Bridge: ~18 mm wide at top, ~22 mm wide at bottom.
//   SINGLE camera on the LEFT lens upper-outer corner (r ~4 mm, recessed),
//   SINGLE small LED dot between the camera and the bridge on the LEFT only.
//
// Reference notes -- features observed directly in /tmp/ray-ban-stories.jpg:
//   - GLOSSY BLACK chunky acetate frame -- the Wayfarer outer silhouette has
//     SMOOTH ARC-ROUNDED transitions between every corner pair: outer-top
//     "wing" curves UP from the horizontal top, outer-bottom curves down and
//     under, the body has visible Y-depth (thick acetate). NO sharp 90 deg
//     corners on the silhouette. This is the most diagnostic visual cue.
//   - Two trapezoidal lens openings, wider at top, slightly narrower at bottom,
//     with rounded inner-bottom (bridge corner) and outer-bottom corners.
//   - Chunky bridge (saddle) between lenses.
//   - SINGLE camera on the LEFT upper-outer corner (this is THE Meta cue).
//   - SINGLE small LED dot between camera and bridge on the LEFT only.
//   - Two thick black temples extending back from the upper-outer corners.
//
// Hidden-side inference: the body is solid acetate (no internal voids); the
//   lens openings are through-cutouts; temples attach at the upper outer
//   hinge area and extend in +Y; on a real Meta the camera is recessed into
//   the front face (NOT proud of it).
//
// Validation focus: front view reads as a Wayfarer (smooth wing curves, no
//   slab); iso view shows acetate depth; the SINGLE LEFT camera asymmetry
//   identifies it as the Meta variant.
//
// Coordinate convention: Z-up, right-handed; "front" view is from -Y to +Y so
//   smallest Y = closest to camera.
//
// Construction plan
// =================
//
// 1) How a real CAD designer builds a Wayfarer acetate frame
//    ---------------------------------------------------------
//    a. Draws the FRONT-FACE SILHOUETTE as a 2D sketch using SPLINES or
//       ARCS at every outer corner -- never four straight edges with sharp
//       corners. The classic Wayfarer "wing" at the upper-outer corner is an
//       arc tangent to the top edge and the outer side.
//    b. EXTRUDES that silhouette through the acetate depth (~10 mm). Optional:
//       LOFT between a slightly-smaller back profile and the front profile
//       to get the acetate taper. We use straight extrude here for clarity.
//    c. Cuts the two LENS OPENINGS using similar arc-cornered closed paths.
//    d. Adds the camera as a small Y-axis cylinder recessed into the front
//       face (on the LEFT only); LED as a tinier proud Y-axis cylinder.
//    e. Builds the two TEMPLES as separate extruded sketches (hinge boss +
//       arm + slight terminal flare). The acetate-on-acetate hinge boss is a
//       short box; the arm is a long thin box that extends in +Y.
//    f. Multi-radius FILLET pass on outer edges to soften the body.
//
// 2) Map to kernelCAD API
//    ---------------------
//    - Silhouette/outline:    path() chained with moveTo/lineTo/tangentArc/
//                             sagittaArc -- closed via .close() -> Sketch.
//    - Sketch -> 3D body:     .extrude(depth) gives a Z-extruded solid; then
//                             .rotate([1,0,0], 90) to lay it onto the XY-Z
//                             plane with the extrusion direction along Y.
//    - Lens cutouts:          another arc-cornered path() -> Sketch -> extrude
//                             -> rotate -> .subtract().
//    - Camera, LED:           cylinder(h, r).alongAxis([0,1,0]) -> translate.
//    - Temples:               extrudePolygon for hinge boss + arm body, then
//                             rotate to lay them along Y.
//    - Soften outer edges:    .fillet(r) global pass at end.
//
// 3) Skills loaded
//    --------------
//    - kernelcad / kernelcad-from-reference / kernelcad-authoring (mandatory).
//    - kernelcad-features (for the post-cutout fillet).
//
// 4) Build sequence (this script implements this order)
//    ---------------------------------------------------
//    (a) Build the front-face silhouette with arcs at every visible corner;
//        confirmed mirror-symmetric across X.
//    (b) Extrude in Y for body depth.
//    (c) Build each lens cutout profile with arcs and subtract.
//    (d) Add camera recess + glass on LEFT only.
//    (e) Add LED on LEFT only.
//    (f) Add temples (two), each extending in +Y from the upper outer hinge.
//    (g) Fillet to soften outer edges.
//    (h) Return one single Shape via union (GLB export requires a single tail
//        shape, not assembly().model()).

// ----------------------------------------------------------------------------
// Dimensions
// ----------------------------------------------------------------------------
const FRAME_DEPTH      = 10;        // Y thickness of the acetate body
const BRIDGE_TOP_W     = 18;
const BRIDGE_BOT_W     = 22;
const LENS_TOP_W       = 52;
const LENS_BOT_W       = 46;
const LENS_H           = 39;
const RIM_TOP          = 11;        // top rim height above lens opening
const RIM_BOT          = 7;         // bottom rim height
const RIM_OUTER        = 9;         // outer-side rim width

// derived
const FRAME_HALF_W     = (BRIDGE_TOP_W / 2) + LENS_TOP_W + RIM_OUTER;   // 9 + 52 + 9 = 70
const LENS_Z_TOP       =  LENS_H / 2;       //  18
const LENS_Z_BOT       = -LENS_H / 2;       // -18
const FRAME_Z_TOP      =  LENS_Z_TOP + RIM_TOP;   //  29
const FRAME_Z_BOT      =  LENS_Z_BOT - RIM_BOT;   // -25

// Wayfarer top-edge slope: the top edge rises from the bridge (low) to the
// outer corner (high), then the outer corner rounds down to the outer side.
// This is the iconic Wayfarer "wing" silhouette, refactored so the entire
// top edge is one continuous arc instead of a horn-like protrusion.
const TOP_BRIDGE_RISE  = 7;     // how much higher the outer-top corner sits vs bridge top
const TOP_CORNER_R     = 6;     // radius of the outer-top "wing" corner itself

// Outer-bottom corner: a gentle rounded transition (not a wing -- the bottom
// outer corner on a Wayfarer is smoother, less dramatic).
const BOT_CORNER_R     = 6;

// Inner-top transition to the bridge (smooth bridge top)
const BRIDGE_TOP_SAG   = 1.5;   // small dip in the middle of the bridge

// Lens cutout corner radii
const LENS_INNER_BOT_R = 5;     // big radius near bridge bottom (very rounded)
const LENS_OUTER_BOT_R = 7;     // big radius at lens outer-bottom corner
const LENS_TOP_R       = 3;     // smaller radius on top corners

// Camera and LED placement (LEFT side only)
const CAMERA_R         = 4.2;
const CAMERA_RING_H    = 1.6;
const CAMERA_INNER_R   = 2.6;
const CAMERA_LENS_T    = 0.5;

const LED_R            = 0.9;
const LED_H            = 0.6;

// Temple geometry. Real Wayfarer temples are ~135 mm long; if we used that
// here the Y bounding-box (10 mm body + 135 mm temple = 145 mm) would dominate
// the X span (~140 mm) and the renderer's auto-frame would shrink the front
// view to fit. We use a SHORTER (45 mm) stub temple instead -- enough that
// the iso/right views read as "real glasses with temples" but X stays the
// longest axis, so the FRONT VIEW frames the full Wayfarer silhouette.
const TEMPLE_LEN       = 45;
const TEMPLE_H         = 12;        // Z height of the arm
const TEMPLE_T         = 5;         // X thickness of the arm
const HINGE_BOSS_LEN   = 8;         // Y depth of the boss block
const HINGE_BOSS_T     = 8;         // X thickness of the boss block
const HINGE_BOSS_H     = 16;        // Z height of the boss block

// Render color -- we apply a single color to the final union (booleans drop
// per-leaf colors). Pure black against the dark renderer background would be
// invisible, so we use a slightly raised value that still reads as "glossy
// dark acetate".
// Lighter than pure black so the silhouette is visible against the dark
// renderer background; still reads as "glossy dark acetate" in renders.
const COLOR_FRAME      = '#6c6c6c';

// ----------------------------------------------------------------------------
// Build the FRONT-FACE SILHOUETTE in the sketch (XZ) plane.
//
// Coordinate model for the sketch:  (sketch_x, sketch_y) maps to (world X, Z)
// after we extrude along Z then rotate(X, +90), at which point the extrusion
// axis lies along world +Y.
//
// We trace the WHOLE silhouette in one closed path, CCW, using arcs at every
// outer corner. The shape is mirror-symmetric across the X=0 axis -- we
// author the right half explicitly (no point cloning) plus the left half
// explicitly with the SAME arc choices reflected. Authoring the path point-
// by-point keeps the arc-tangency directions correct in both halves.
//
// Walk (CCW):
//   1. Start at the BRIDGE BOTTOM-RIGHT (small +X, FRAME_Z_TOP) - this is the
//      top edge above the bridge.   Actually: we start at TOP-CENTER and walk
//      RIGHT -> outer-top wing -> outer-side -> outer-bottom -> bottom edge
//      -> mirror left side -> back to start.
// ----------------------------------------------------------------------------

const sx = FRAME_HALF_W;

// Wayfarer silhouette keypoints (right half, traced CCW from top-center):
//   - bridge_top  : top-center, slightly below FRAME_Z_TOP -- this is the LOWER
//                   part of the top edge that dips toward the nose.
//   - outer_top   : the upper-outer "wing" corner -- the highest point of the
//                   silhouette, sits at FRAME_Z_TOP.
//   - outer_topR  : after the outer-top corner arc, where the outer side
//                   transitions to vertical.
//   - bot_outer_*: outer-bottom rounded corner keypoints.
const bridgeTopZ      = FRAME_Z_TOP - TOP_BRIDGE_RISE;     //  29 - 5 = 24
// outer-top wing corner sits at (sx, FRAME_Z_TOP) but the corner is rounded by
// TOP_CORNER_R, so we pre-pull the top-edge endpoint inward and start the
// outer side a bit below the top.
const outerTopCornerInnerX = sx - TOP_CORNER_R;            //  70 - 4 = 66
const outerTopCornerLowerZ = FRAME_Z_TOP - TOP_CORNER_R;   //  29 - 4 = 25

const botCornerOuterZ = FRAME_Z_BOT + BOT_CORNER_R;
const botCornerInnerX = sx - BOT_CORNER_R;

// Path: top-center -> arc up to outer-top -> corner arc -> outer side ->
// bot-outer corner -> bottom edge -> mirror left.
//
// The top edge is one continuous CONCAVE-UP arc rising from bridge to outer-top.
// Using sagittaArc with NEGATIVE sagitta produces a bulge toward -Y from the
// chord; we want it to bulge toward +Z (the chord runs (0, bridgeTopZ) to
// (outerTopCornerInnerX, FRAME_Z_TOP); we want the arc to bulge UPWARD i.e.
// positive Z direction). sagittaArc(end, sagitta): positive sagitta bulges
// LEFT of the chord direction. We're traveling +X, so "left" is +Z. Use
// positive sagitta for an upward bulge.
const silhouette = path()
  .moveTo(0, bridgeTopZ)                                    // top center (low bridge)
  // Top edge: ONE CONTINUOUS UPWARD ARC from bridge top to outer-top corner.
  .sagittaArc(outerTopCornerInnerX, FRAME_Z_TOP, 1.5)
  // Wing CORNER: tangent arc rounding the outer-top corner down to the outer side.
  .tangentArc(sx, outerTopCornerLowerZ)
  // Outer side: gentle convex outward bow.
  .sagittaArc(sx, botCornerOuterZ, -0.3)
  // Outer-bottom rounded corner.
  .tangentArc(botCornerInnerX, FRAME_Z_BOT)
  // Bottom edge: gentle SAG (concave UP, but bulges DOWN slightly) for a
  // Wayfarer's "lazy smile" bottom.
  .sagittaArc(0, FRAME_Z_BOT - 0.5, -0.5)
  // ---- MIRROR (left half) ----
  .sagittaArc(-botCornerInnerX, FRAME_Z_BOT, -0.5)
  .tangentArc(-sx, botCornerOuterZ)
  .sagittaArc(-sx, outerTopCornerLowerZ, -0.3)
  .tangentArc(-outerTopCornerInnerX, FRAME_Z_TOP)
  .sagittaArc(0, bridgeTopZ, 1.5)
  .close();

// Extrude the silhouette in Z (its native direction) then rotate so the
// extrusion direction becomes world +Y. After rotate(X, +90):
//   pre_X -> world X         (unchanged)
//   pre_Y -> world Z         (silhouette Y was Z; remains Z)
//   pre_Z -> world -Y        (extrusion direction maps to -Y; we translate
//                             back by +depth on Y to span Y in [0, depth]).
const silBody = silhouette
  .extrude(FRAME_DEPTH)
  .rotate([1, 0, 0], 90)
  .translate(0, FRAME_DEPTH, 0);

// ----------------------------------------------------------------------------
// Build a LENS CUTOUT for one side. xSign = -1 for left lens, +1 for right.
// All corners are arcs; the inner-bottom and outer-bottom corners get the
// biggest radii (matches the photo's strongly-rounded bottom corners).
// ----------------------------------------------------------------------------
function lensCutout(xSign) {
  const innerTopX = xSign * (BRIDGE_TOP_W / 2);
  const outerTopX = xSign * (BRIDGE_TOP_W / 2 + LENS_TOP_W);
  const innerBotX = xSign * (BRIDGE_BOT_W / 2);
  const outerBotX = xSign * (BRIDGE_BOT_W / 2 + LENS_BOT_W);

  // Tracing CCW for xSign=+1 (right lens):
  //   top edge: from inner-top to outer-top (left-to-right along +X)
  //   right side: down to outer-bottom (rounded corner)
  //   bottom edge: leftward to inner-bottom (rounded corner)
  //   inner side: up to inner-top (rounded corner)
  //
  // For xSign=-1 (left lens) we trace the same shape but reverse so the path
  // remains CCW from the kernel's perspective.

  if (xSign > 0) {
    return path()
      .moveTo(innerTopX + LENS_TOP_R, LENS_Z_TOP)             // start just right of inner-top corner
      .lineTo(outerTopX - LENS_TOP_R, LENS_Z_TOP)             // top edge
      .tangentArc(outerTopX, LENS_Z_TOP - LENS_TOP_R)         // outer-top arc
      .lineTo(outerTopX, LENS_Z_BOT + LENS_OUTER_BOT_R)       // right (outer) side going down
      .tangentArc(outerTopX - LENS_OUTER_BOT_R, LENS_Z_BOT)   // outer-bottom big arc
      .lineTo(innerBotX + LENS_INNER_BOT_R, LENS_Z_BOT)       // bottom edge going LEFT
      .tangentArc(innerBotX, LENS_Z_BOT + LENS_INNER_BOT_R)   // inner-bottom big arc
      .lineTo(innerBotX, LENS_Z_TOP - LENS_TOP_R)             // inner side going up
      .tangentArc(innerTopX + LENS_TOP_R, LENS_Z_TOP)         // inner-top arc, closes back to start
      .close();
  } else {
    // Mirrored CCW order for left lens. xSign = -1 means:
    //   innerTopX = -BRIDGE_TOP_W/2  (close to 0, but negative)
    //   outerTopX = -(BRIDGE_TOP_W/2 + LENS_TOP_W)  (much more negative)
    //   innerBotX = -BRIDGE_BOT_W/2
    //   outerBotX = -(BRIDGE_BOT_W/2 + LENS_BOT_W)
    // Trace CCW (kernel-perspective). Equivalent to right-lens shape mirrored
    // across X=0. We start at outer-top corner moving along the top to inner-top.
    // CRITICAL: the very FIRST segment after .moveTo cannot be a .tangentArc
    // (there is no prior curve direction). So we always start with a .lineTo.
    return path()
      .moveTo(outerTopX + LENS_TOP_R, LENS_Z_TOP)             // start just inside of outer-top corner
      .lineTo(innerTopX - LENS_TOP_R, LENS_Z_TOP)             // top edge going RIGHT (toward +X, less negative)
      .tangentArc(innerTopX, LENS_Z_TOP - LENS_TOP_R)         // inner-top arc
      .lineTo(innerTopX, LENS_Z_BOT + LENS_INNER_BOT_R)       // inner side going DOWN
      .tangentArc(innerBotX - LENS_INNER_BOT_R, LENS_Z_BOT)   // inner-bottom big arc
      .lineTo(outerBotX + LENS_OUTER_BOT_R, LENS_Z_BOT)       // bottom edge going LEFT (toward -X)
      .tangentArc(outerBotX, LENS_Z_BOT + LENS_OUTER_BOT_R)   // outer-bottom big arc
      .lineTo(outerBotX, LENS_Z_TOP - LENS_TOP_R)             // outer side going up
      .tangentArc(outerTopX + LENS_TOP_R, LENS_Z_TOP)         // outer-top arc closes back
      .close();
  }
}

function lensCutoutSolid(xSign) {
  return lensCutout(xSign)
    .extrude(FRAME_DEPTH + 4)
    .rotate([1, 0, 0], 90)
    .translate(0, FRAME_DEPTH + 2, 0);   // overshoot front and back so the cut is unambiguous
}

// Lens insert: a thin tinted plate seated INSIDE the cutout. The plate fills
// the lens opening so that from the front view the lens reads as dark glass
// (matching the photo) rather than the bright inner walls of the cutout.
// We shrink the lens profile slightly from the cutout profile so the lens
// doesn't fight the rim wall.
const LENS_INSERT_SHRINK = 0.5;
function lensInsert(xSign) {
  const innerTopX = xSign * (BRIDGE_TOP_W / 2 + LENS_INSERT_SHRINK);
  const outerTopX = xSign * (BRIDGE_TOP_W / 2 + LENS_TOP_W - LENS_INSERT_SHRINK);
  const innerBotX = xSign * (BRIDGE_BOT_W / 2 + LENS_INSERT_SHRINK);
  const outerBotX = xSign * (BRIDGE_BOT_W / 2 + LENS_BOT_W - LENS_INSERT_SHRINK);
  const innerR = LENS_INNER_BOT_R - LENS_INSERT_SHRINK;
  const outerR = LENS_OUTER_BOT_R - LENS_INSERT_SHRINK;
  const topR = LENS_TOP_R - LENS_INSERT_SHRINK;
  const zTop = LENS_Z_TOP - LENS_INSERT_SHRINK;
  const zBot = LENS_Z_BOT + LENS_INSERT_SHRINK;
  let p;
  if (xSign > 0) {
    p = path()
      .moveTo(innerTopX + topR, zTop)
      .lineTo(outerTopX - topR, zTop)
      .tangentArc(outerTopX, zTop - topR)
      .lineTo(outerTopX, zBot + outerR)
      .tangentArc(outerTopX - outerR, zBot)
      .lineTo(innerBotX + innerR, zBot)
      .tangentArc(innerBotX, zBot + innerR)
      .lineTo(innerBotX, zTop - topR)
      .tangentArc(innerTopX + topR, zTop)
      .close();
  } else {
    p = path()
      .moveTo(outerTopX + topR, zTop)
      .lineTo(innerTopX - topR, zTop)
      .tangentArc(innerTopX, zTop - topR)
      .lineTo(innerTopX, zBot + innerR)
      .tangentArc(innerBotX - innerR, zBot)
      .lineTo(outerBotX + outerR, zBot)
      .tangentArc(outerBotX, zBot + outerR)
      .lineTo(outerBotX, zTop - topR)
      .tangentArc(outerTopX + topR, zTop)
      .close();
  }
  // Lens plate is 2 mm thick, recessed 1 mm back from the front face of the
  // body so the rim still reads.
  return p
    .extrude(2)
    .rotate([1, 0, 0], 90)
    .translate(0, 3, 0);  // Y in [1, 3] — well inside the body Y∈[0,10]
}

// ----------------------------------------------------------------------------
// Camera ring (LEFT lens upper-outer corner). Recessed into the front face.
// The "front face" of the body is at Y = 0 (camera-facing). We cut a shallow
// counterbore into Y in [0, CAMERA_RING_H] and place a thin "lens" cylinder
// at the bottom of the counterbore.
// ----------------------------------------------------------------------------
const CAM_X = -(BRIDGE_TOP_W / 2 + LENS_TOP_W) + CAMERA_R + 2;   // ~ -55.8
const CAM_Z = LENS_Z_TOP + CAMERA_R + 0.4;                       // ~ 22.6

const cameraCounterbore = cylinder(CAMERA_RING_H + 0.6, CAMERA_R, 64)
  .alongAxis([0, 1, 0])
  .translate(CAM_X, -0.3, CAM_Z);   // recessed bore from Y=-0.3 to Y=CAMERA_RING_H+0.3

const cameraLens = cylinder(CAMERA_LENS_T, CAMERA_INNER_R, 48)
  .alongAxis([0, 1, 0])
  .translate(CAM_X, CAMERA_RING_H - CAMERA_LENS_T, CAM_Z);

// ----------------------------------------------------------------------------
// LED dot (LEFT side, between camera and bridge). Slightly proud of the front
// face so it reads as a small bump.
// ----------------------------------------------------------------------------
const LED_X = (CAM_X + (-BRIDGE_TOP_W / 2)) / 2;
const LED_Z = LENS_Z_TOP + RIM_TOP * 0.55;

const led = cylinder(LED_H, LED_R, 32)
  .alongAxis([0, 1, 0])
  .translate(LED_X, -LED_H, LED_Z);

// ----------------------------------------------------------------------------
// Temples. A hinge boss (short, chunky) sits at the upper outer hinge area,
// then the arm extends in +Y for TEMPLE_LEN. We build both temples (left and
// right) explicitly so the symmetry is visible.
// ----------------------------------------------------------------------------
function temple(xSign) {
  const hingeX     = xSign * (FRAME_HALF_W - HINGE_BOSS_T / 2 - 0.5);  // sit on outer rim
  const hingeYBack = FRAME_DEPTH;                                       // boss extends in +Y
  const hingeZ     = FRAME_Z_TOP - HINGE_BOSS_H / 2 - 1;
  const boss = box(HINGE_BOSS_T, HINGE_BOSS_LEN, HINGE_BOSS_H, true)
    .translate(hingeX, hingeYBack + HINGE_BOSS_LEN / 2, hingeZ);
  const armY0 = hingeYBack + HINGE_BOSS_LEN;
  const arm = box(TEMPLE_T, TEMPLE_LEN, TEMPLE_H, true)
    .translate(hingeX, armY0 + TEMPLE_LEN / 2, hingeZ);
  return boss.union(arm);
}

// ----------------------------------------------------------------------------
// Compose. We accumulate via a left-fold of .union/.subtract on the body so
// that the GLB exporter sees a single tail Shape (NOT assembly().model()).
//
// Pipeline:
//   silBody                                  : solid Wayfarer body
//     .subtract(left lens cutout)             : open left eye
//     .subtract(right lens cutout)            : open right eye
//     .subtract(cameraCounterbore)            : recess camera into LEFT body
//     .union(cameraLens)                      : tiny lens disc at counterbore bottom
//     .union(led)                             : small bump on LEFT rim
//     .union(temple(-1)).union(temple(+1))    : two temples (chunky arms)
//     .fillet(0.8)                            : SOFTEN ALL OUTER EDGES (per skill guide)
//     .color('#1a1a1a')                       : single tail color
// ----------------------------------------------------------------------------

const glasses = silBody
  .subtract(lensCutoutSolid(-1))
  .subtract(lensCutoutSolid(+1))
  .subtract(cameraCounterbore)
  .union(lensInsert(-1))     // dark "glass" plate filling the left opening
  .union(lensInsert(+1))     // dark "glass" plate filling the right opening
  .union(cameraLens)
  .union(led)
  .union(temple(-1))
  .union(temple(+1))
  .color(COLOR_FRAME);

return glasses;
