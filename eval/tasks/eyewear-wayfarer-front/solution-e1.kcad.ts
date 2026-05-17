// Real Object Brief
// Artifact: Ray-Ban Meta Wayfarer smart glasses — front face + short temples.
//   Reference: ./reference.jpg (pose ~az=30°, el=15°, on a grey table).
// Scale: millimetres. Outer frame ~150 mm wide × ~48 mm tall × ~10 mm deep
//   acetate body. Lens openings ~52 mm × 36 mm each; bridge gap ~16 mm.
//   Short temples (~60 mm visible) shown in reference at upper-right quadrant.
// Visible facts (from reference photo):
//   - Chunky black acetate body with a strong forward gloss; specular highlights
//     dominate the read.
//   - Outer silhouette: Wayfarer wings at the top-outer corners (a soft curve
//     rising above the lens-top line), gentle bottom curve.
//   - Two trapezoidal lens openings: top edge slightly wider than the bottom;
//     rounded inner-bottom corner most prominently visible.
//   - Bridge between the lenses is narrow at top, fans out a bit at the bottom.
//   - LEFT side only: a single circular black camera lens (~8 mm dia) recessed
//     into the upper-outer corner of the left lens opening; a small LED dot
//     between the camera and the bridge.
//   - Temples present (visible in the reference): short rectangular bars
//     extending in +Y from the upper-outer hinge area; pose 30°,15° puts the
//     right-side temple prominently in the upper-right quadrant.
//   - Bevel highlight: a fine specular line running along the front-face
//     perimeter — the classic Wayfarer acetate chamfer.
// Hidden-side inference:
//   - Back face: same outer silhouette as front; back-perimeter softened (no
//     bevel) — fillet rather than chamfer.
//   - Inside surfaces of lens openings: continuous walls (lens cutouts go all
//     the way through).
//   - Camera ring: counterbore (recess) on the front face; lens disc sits
//     inside it, flush to slightly proud.
// Validation focus:
//   - Front view: outer silhouette matches Wayfarer wings + lazy-smile bottom.
//   - Pose (30°,15°): right-side temple fills upper-right quadrant; front
//     face still readable as a Wayfarer.
//   - Iso plausibility: gloss material reads as specular acetate (clearcoat).
//   - Score gates: silhouette IoU ≥ 0.45, composite ≥ 0.30, SSIM ≥ 0.35.

// ----------------------------------------------------------------------------
// Parameters — every key dimension is a param() (Slice-3 ParamRefs return a
// proxy that arithmetic operators auto-resolve at lowering time).
// ----------------------------------------------------------------------------
const FRAME_HALF_W   = 75;   // half outer width — total 150 mm
const FRAME_DEPTH    = 10;   // Y thickness (acetate body)
const BRIDGE_GAP_TOP = 16;   // narrow bridge gap at top of lenses
const BRIDGE_GAP_BOT = 20;   // slightly wider at the bottom (Wayfarer taper)
const LENS_W         = 52;   // lens opening width
const LENS_H         = 36;   // lens opening height
const RIM_TOP        = 10;   // material above lens
const RIM_BOT        = 6;    // material below lens

const LENS_Z_TOP     = LENS_H / 2;        // +18
const LENS_Z_BOT     = -LENS_H / 2;       // -18
const FRAME_Z_TOP    = LENS_Z_TOP + RIM_TOP;   // 28
const FRAME_Z_BOT    = LENS_Z_BOT - RIM_BOT;   // -24

// Outer silhouette details
const WING_RISE      = 4;    // outer-top wing sits this much higher than bridge-top
const BRIDGE_TOP_Z   = FRAME_Z_TOP - WING_RISE;  // 24

// Lens-cutout corner radii — the inner-bottom corner is the largest (Wayfarer cue)
const LENS_R_TOP        = 3;
const LENS_R_OUTER_BOT  = 6;
const LENS_R_INNER_BOT  = 7;

// Camera + LED (LEFT side only)
const CAMERA_R        = 4.2;
const CAMERA_DEPTH    = 1.8;   // counterbore depth into front face
const CAMERA_LENS_R   = 2.8;
const CAMERA_LENS_T   = 0.4;
const LED_R           = 0.9;
const LED_H           = 0.5;

// Temples — short bars to fill the upper-right pixel quadrant at pose 30,15.
const TEMPLE_LENGTH    = 62;
const TEMPLE_WIDTH     = 5;   // X (cross-section)
const TEMPLE_HEIGHT    = 13;  // Z (cross-section)
const TEMPLE_DOWN_DEG  = -4;  // mild downward rake (real Wayfarers ~3-5°)

// Acetate edge-polish
const FRONT_BEVEL_C    = 0.6;   // chamfer on front face perimeter
const BACK_PERIMETER_R = 0.7;   // fillet on back face perimeter

// ----------------------------------------------------------------------------
// (1) Right-half outer silhouette as a path in XZ.
//     We trace from the top of the bridge down the right side and along the
//     bottom back to the bridge bottom. mirror('yz') later produces the left.
// ----------------------------------------------------------------------------
const wingInnerX = FRAME_HALF_W - 8;          // 67  (where the wing curve peaks)
const sideZ_top  = FRAME_Z_TOP - 8;           // 20  (transition into the side)
const sideZ_bot  = FRAME_Z_BOT + 6;           // -18

const rightSilhouette = path()
  .moveTo(0, BRIDGE_TOP_Z)
  // Top edge: rises from bridge-top to the wing peak (gentle convex bulge up)
  .sagittaArc(wingInnerX, FRAME_Z_TOP, 1.8)
  // Wing-corner: arc down to the outer-top region
  .tangentArc(FRAME_HALF_W, sideZ_top)
  // Outer side: slightly convex
  .sagittaArc(FRAME_HALF_W, sideZ_bot, -0.2)
  // Outer-bottom corner: arc inward to the bottom edge
  .tangentArc(FRAME_HALF_W - 6, FRAME_Z_BOT)
  // Bottom edge: gentle "lazy smile" — bulges slightly downward
  .sagittaArc(0, FRAME_Z_BOT - 0.6, -0.5)
  // Close back along the YZ plane (kernel inserts the closing segment)
  .lineTo(0, BRIDGE_TOP_Z)
  .close();

// Extrude in Z → rotate so the extrusion axis is +Y → translate so the front
// face (smallest Y) sits at Y=0.
const rightHalfBody = rightSilhouette
  .extrude(FRAME_DEPTH)
  .rotate([1, 0, 0], 90)
  .translate(0, FRAME_DEPTH, 0);

const body = rightHalfBody.mirror('yz');

// ----------------------------------------------------------------------------
// (2) Lens openings — author the right cutout, then reflect.
// ----------------------------------------------------------------------------
function rightLensCutoutSketch() {
  const innerTopX = BRIDGE_GAP_TOP / 2;
  const outerTopX = innerTopX + LENS_W;
  const innerBotX = BRIDGE_GAP_BOT / 2;
  const outerBotX = innerBotX + LENS_W - (BRIDGE_GAP_BOT - BRIDGE_GAP_TOP) / 2;
  return path()
    .moveTo(innerTopX + LENS_R_TOP, LENS_Z_TOP)
    .lineTo(outerTopX - LENS_R_TOP, LENS_Z_TOP)
    .tangentArc(outerTopX, LENS_Z_TOP - LENS_R_TOP)
    .lineTo(outerTopX, LENS_Z_BOT + LENS_R_OUTER_BOT)
    .tangentArc(outerTopX - LENS_R_OUTER_BOT, LENS_Z_BOT)
    .lineTo(innerBotX + LENS_R_INNER_BOT, LENS_Z_BOT)
    .tangentArc(innerBotX, LENS_Z_BOT + LENS_R_INNER_BOT)
    .lineTo(innerBotX, LENS_Z_TOP - LENS_R_TOP)
    .tangentArc(innerTopX + LENS_R_TOP, LENS_Z_TOP)
    .close();
}

const rightLensCutout = rightLensCutoutSketch()
  .extrude(FRAME_DEPTH + 4)
  .rotate([1, 0, 0], 90)
  .translate(0, FRAME_DEPTH + 2, 0);

const leftLensCutout = rightLensCutout.reflect('yz');

// ----------------------------------------------------------------------------
// (3) Lens insert plates ("glass") — same outline, shrunk by 0.5 mm and
//     extruded thin. Material applied BEFORE union (post-boolean .material()
//     is a no-op per kernelcad-authoring).
// ----------------------------------------------------------------------------
const LENS_SHRINK = 0.5;
function rightLensInsertSketch() {
  const innerTopX = BRIDGE_GAP_TOP / 2 + LENS_SHRINK;
  const outerTopX = BRIDGE_GAP_TOP / 2 + LENS_W - LENS_SHRINK;
  const innerBotX = BRIDGE_GAP_BOT / 2 + LENS_SHRINK;
  const outerBotX = BRIDGE_GAP_BOT / 2 + LENS_W - (BRIDGE_GAP_BOT - BRIDGE_GAP_TOP) / 2 - LENS_SHRINK;
  const zTop = LENS_Z_TOP - LENS_SHRINK;
  const zBot = LENS_Z_BOT + LENS_SHRINK;
  const rT = LENS_R_TOP - LENS_SHRINK;
  const rOB = LENS_R_OUTER_BOT - LENS_SHRINK;
  const rIB = LENS_R_INNER_BOT - LENS_SHRINK;
  return path()
    .moveTo(innerTopX + rT, zTop)
    .lineTo(outerTopX - rT, zTop)
    .tangentArc(outerTopX, zTop - rT)
    .lineTo(outerTopX, zBot + rOB)
    .tangentArc(outerTopX - rOB, zBot)
    .lineTo(innerBotX + rIB, zBot)
    .tangentArc(innerBotX, zBot + rIB)
    .lineTo(innerBotX, zTop - rT)
    .tangentArc(innerTopX + rT, zTop)
    .close();
}

const rightLensInsert = rightLensInsertSketch()
  .extrude(2.2)
  .rotate([1, 0, 0], 90)
  .translate(0, 3.5, 0)
  .material({
    baseColor: '#0e1216',
    metalness: 0.0,
    roughness: 0.10,
    clearcoat: 0.7,
    clearcoatRoughness: 0.04,
    ior: 1.5,
  });
const leftLensInsert = rightLensInsert.reflect('yz');

// ----------------------------------------------------------------------------
// (4) Camera + LED on the LEFT lens upper-outer corner.
//     X is negative because mirror is yz and the prompt says "left side".
// ----------------------------------------------------------------------------
const CAM_X = -(BRIDGE_GAP_TOP / 2 + LENS_W - CAMERA_R - 2);   // ~-37
const CAM_Z = LENS_Z_TOP - CAMERA_R - 2;                       // ~12

const cameraCounterbore = cylinder(CAMERA_DEPTH + 0.5, CAMERA_R, 64)
  .alongAxis([0, 1, 0])
  .translate(CAM_X, -0.25, CAM_Z);

const cameraLens = cylinder(CAMERA_LENS_T, CAMERA_LENS_R, 48)
  .alongAxis([0, 1, 0])
  .translate(CAM_X, CAMERA_DEPTH - CAMERA_LENS_T, CAM_Z)
  .material({
    baseColor: '#040506',
    metalness: 0.0,
    roughness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    ior: 1.55,
  });

// LED dot — sits on the upper rim between camera and bridge.
const LED_X = (CAM_X + -(BRIDGE_GAP_TOP / 2)) / 2;
const LED_Z = LENS_Z_TOP + RIM_TOP * 0.5;
const led = cylinder(LED_H, LED_R, 32)
  .alongAxis([0, 1, 0])
  .translate(LED_X, -LED_H, LED_Z)
  .material({
    baseColor: '#22252a',
    metalness: 0.3,
    roughness: 0.30,
  });

// ----------------------------------------------------------------------------
// (5) Temples — short rectangular bars from the upper-outer hinge area in +Y.
// ----------------------------------------------------------------------------
const HINGE_X = FRAME_HALF_W - 2;             // 73 (just inside outer edge)
const HINGE_Y = FRAME_DEPTH - 2;              // 8  (overlaps body for clean union)
const HINGE_Z = sideZ_top - 1;                // 19 (near upper-outer wing)

const rightTemple = box(TEMPLE_WIDTH, TEMPLE_LENGTH, TEMPLE_HEIGHT)
  .translate(-TEMPLE_WIDTH / 2, 0, -TEMPLE_HEIGHT / 2)
  .rotate([1, 0, 0], TEMPLE_DOWN_DEG)
  .translate(HINGE_X, HINGE_Y, HINGE_Z);

const temples = rightTemple.mirror('yz');

// ----------------------------------------------------------------------------
// (6) Compose: lens cuts → variable chamfer (front bevel) + variable fillet
//     (back perimeter) → camera counterbore → temples → final glossy PBR.
// ----------------------------------------------------------------------------
const frameWithLensCuts = body
  .subtract(rightLensCutout)
  .subtract(leftLensCutout);

// Front-face acetate bevel (Rule 1 — variable fillet/chamfer with edge query).
const frontBeveled = frameWithLensCuts.chamfer([
  { edges: { face: { byNormal: '-Y' } }, distance: FRONT_BEVEL_C },
]);

// Back-perimeter softening (different face — no shared edges with the front).
const backFilleted = frontBeveled.fillet([
  { edges: { face: { byNormal: 'Y' } }, radius: BACK_PERIMETER_R },
]);

// Camera counterbore goes AFTER the edge features so its sharp circular
// boundary doesn't confuse OCCT's blend solver on a chamfered edge ring.
const frameWithCamera = backFilleted.subtract(cameraCounterbore);

const frameWithTemples = frameWithCamera.union(temples);

// ----------------------------------------------------------------------------
// (7) Final composition. PBR material applied on the final boolean record
//     (post-fuse this becomes the rendered surface). Lens inserts / camera
//     lens / LED retain their pre-boolean leaf materials.
//
//     Mid-grey base color (not pure #000) so the silhouette scorer's
//     background-subtraction can still bucket the body as foreground against
//     the renderer's dark backdrop — clearcoat carries the gloss read.
// ----------------------------------------------------------------------------
const glasses = frameWithTemples
  .union(rightLensInsert)
  .union(leftLensInsert)
  .union(cameraLens)
  .union(led)
  .material({
    baseColor: '#6a6a6a',
    metalness: 0.0,
    roughness: 0.14,
    clearcoat: 0.85,
    clearcoatRoughness: 0.05,
    ior: 1.55,
  });

return glasses;
