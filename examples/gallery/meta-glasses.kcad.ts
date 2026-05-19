// Ray-Ban Meta — Wayfarer (gallery hero, NURBS rewrite).
//
// Hero capability: the brow silhouette is a single `path().spline([...])`
// pass — Slice D's 2D NURBS path API. The same API authors the upper edge
// of the body, the squarish-rounded lens-opening cutouts, AND the V-notch
// transition. No more arc-only build that read as a generic black frame.
//
// Visual targets from `eval/tasks/eyewear-wayfarer-front/reference.jpg`:
//   1. Wayfarer brow — wing peaks curl up & out on the outer-upper corners,
//      bridge dips between the two wings (one continuous spline).
//   2. Trapezoidal lens openings (wider top, narrower bottom by ~22%)
//      with smoothly-curved corners — squarish-rounded NURBS outline.
//   3. V-notch nose cut INTO the bridge from below.
//   4. Glossy black acetate body + dark tinted lens INSERTS (NOT material
//      on the body — kernel-renders-leaf-material via assembly fan-out).
//   5. Camera + LED on the LEFT lens upper-outer corner (Meta cue).
//
// Coordinate convention: sketch plane = (x, z); after extrude(FRAME_DEPTH)
// + rotate([1,0,0], 90), the body spans world Y = [-FRAME_DEPTH, 0]; we
// translate +FRAME_DEPTH so the camera-facing front face sits at Y=0.
//
// Material strategy: per `kernelcad_material_after_union_pitfall`, leaf
// materials are NOT preserved through .union(). Use `assembly()` + per-part
// material so the body (acetate) and lens inserts (dark tint) survive as
// separate ScenePart records in the static render.

// ----------------------------------------------------------------------------
// Parameters (mm)
// ----------------------------------------------------------------------------
const FRAME_DEPTH = 8;          // front-to-back acetate thickness

// Brow / silhouette dimensions
const FRAME_HALF_W = 60;        // half-width to outer wing tip (NOT 70 — that crops)
const FRAME_Z_BOT  = -22;       // bottom edge z
const FRAME_Z_TOP  = 20;        // brow line z (essentially flat across)
const WING_PEAK_RISE = 2.5;     // extra rise at the wing tip above brow line (curl)

// Lens trapezoidal opening — wider top, ~22% narrower bottom (Wayfarer signature)
const LENS_TOP_W   = 38;        // top-edge width
const LENS_BOT_W   = 30;        // bottom-edge width (~21% narrower)
const LENS_H       = 32;        // vertical height
const LENS_CX      = 26;        // x offset of lens center from origin
const LENS_CZ      = -1;        // z offset of lens center
const LENS_CORNER_R = 5.5;      // corner rounding (squarish-rounded NURBS)

// Bridge / nose notch
const NOSE_NOTCH_HALF_W = 4;    // half-width of inverted-V cut
const NOSE_NOTCH_DEPTH  = 4.5;  // depth of cut INTO bridge from top
// Top of the V-notch sits BELOW the brow line so the cut does not reach the
// brow silhouette — gives the bridge a small downward V seen in the photo.
const NOSE_NOTCH_TOP_Z  = FRAME_Z_TOP - 1.5;

// Camera + LED (on LEFT lens upper-outer corner)
const CAMERA_R = 5;
const CAMERA_DEPTH = 2.5;
const LED_R = 1;
const LED_DEPTH = 0.8;

// ----------------------------------------------------------------------------
// Body silhouette — full perimeter as ONE closed path. The TOP edge (brow)
// is a single .spline([...]) call: 7 waypoints sweeping from left wing tip
// down into the bridge dip and back up to the right wing tip. This is the
// hero NURBS capability — the prior build used 3 arc segments and looked
// like generic blocky eyewear.
// ----------------------------------------------------------------------------

// Brow waypoints (sketch-local (x, z)). The brow is essentially a flat
// horizontal line with subtle wing-peak rise on the OUTSIDE — the visible
// "wing curl" of a Wayfarer is the OUTER-TOP corner peaking slightly above
// the rest of the brow line. NO bridge dip in the silhouette — the V-notch
// cut below provides the small bridge saddle.
const browSpline: [number, number][] = [
  [-FRAME_HALF_W,         FRAME_Z_TOP],                       // left wing tip start
  [-FRAME_HALF_W * 0.85,  FRAME_Z_TOP + WING_PEAK_RISE],      // L wing peak (curls UP)
  [-FRAME_HALF_W * 0.55,  FRAME_Z_TOP + 0.4],                 // descent into flat brow
  [-FRAME_HALF_W * 0.20,  FRAME_Z_TOP],                       // flat brow (L of center)
  [ 0,                    FRAME_Z_TOP],                       // dead-center flat
  [ FRAME_HALF_W * 0.20,  FRAME_Z_TOP],                       // flat brow (R of center)
  [ FRAME_HALF_W * 0.55,  FRAME_Z_TOP + 0.4],
  [ FRAME_HALF_W * 0.85,  FRAME_Z_TOP + WING_PEAK_RISE],      // R wing peak
  [ FRAME_HALF_W,         FRAME_Z_TOP],                       // right wing tip end
];

// Bottom edge — gentle smile (one slightly-sagged spline) with simple
// straight sides up to the brow line. Side edges are nearly vertical with
// a tiny outward taper at the top into the wing tip.
// Body silhouette — single closed path. Bottom & sides use straight lines
// (no arc/spline overshoot) for a deterministic outline; the BROW uses the
// hero spline. The bottom-corner inset gives the slight trapezoidal taper.
const BOT_INSET = 6;
const bodySilhouette = path()
  // Start at left wing tip
  .moveTo(-FRAME_HALF_W, FRAME_Z_TOP)
  // BROW: single continuous spline (the hero NURBS API). Tension 0.5 reins
  // in overshoot per the path-spline gotcha so the wing peaks don't drift.
  .spline(browSpline, { tension: 0.5 })
  // Right side: down from wing tip, slightly inset at the bottom for the
  // trapezoidal taper.
  .lineTo(FRAME_HALF_W - BOT_INSET, FRAME_Z_BOT)
  // BOTTOM: shallow smile via spline (3 waypoints)
  .spline([
    [ FRAME_HALF_W - BOT_INSET, FRAME_Z_BOT],
    [ 0,                         FRAME_Z_BOT - 2],
    [-FRAME_HALF_W + BOT_INSET, FRAME_Z_BOT],
  ], { tension: 0.5 })
  // Left side: up to wing tip
  .lineTo(-FRAME_HALF_W, FRAME_Z_TOP)
  .close();

// Reorient: sketch (x, y, z) → world (x, -z, y). Rotation around +X by +90°.
// After: model spans world Y in [-FRAME_DEPTH, 0]; translate so front face
// (smallest Y face camera-side) sits at Y=0.
const body = bodySilhouette
  .extrude(FRAME_DEPTH)
  .rotate([1, 0, 0], 90)
  .translate(0, FRAME_DEPTH, 0);

// ----------------------------------------------------------------------------
// Lens openings — squarish-rounded outline via path().spline at each corner.
// Trapezoidal: top edge wider than bottom by LENS_TOP_W - LENS_BOT_W. The
// four corners are 3-waypoint splines for a smooth Wayfarer-style fillet.
// ----------------------------------------------------------------------------

function lensCutoutSketch(signX: 1 | -1) {
  const cx = signX * LENS_CX;
  const halfTop = LENS_TOP_W / 2;
  const halfBot = LENS_BOT_W / 2;
  const halfH   = LENS_H / 2;
  const k = LENS_CORNER_R;

  // Trapezoidal corner anchors (sketch x, z), about (cx, LENS_CZ):
  const TLx = cx - halfTop, TLz = LENS_CZ + halfH;
  const TRx = cx + halfTop, TRz = LENS_CZ + halfH;
  const BRx = cx + halfBot, BRz = LENS_CZ - halfH;
  const BLx = cx - halfBot, BLz = LENS_CZ - halfH;

  // Slope unit vector down each slanted side, used to seed corner splines.
  // Top-right corner: travels from along-top-edge → down-right-slant.
  return path()
    // Start near top-left corner (just inboard of TL on the top edge)
    .moveTo(TLx + k, TLz)
    // Top edge (straight)
    .lineTo(TRx - k, TRz)
    // Top-right corner spline (3 waypoints: edge tangent → corner → side tangent)
    .spline([
      [TRx - k, TRz],
      [TRx + k * 0.2, TRz - k * 0.4],
      [TRx, TRz - k],
    ])
    // Right slanted side down to bottom-right corner zone
    .lineTo(BRx + (TRx - BRx) * (k / LENS_H), BRz + k)
    // Bottom-right corner spline
    .spline([
      [BRx + (TRx - BRx) * (k / LENS_H), BRz + k],
      [BRx + k * 0.1, BRz - k * 0.2],
      [BRx - k * 0.6, BRz],
    ])
    // Bottom edge (straight)
    .lineTo(BLx + k * 0.6, BLz)
    // Bottom-left corner spline
    .spline([
      [BLx + k * 0.6, BLz],
      [BLx - k * 0.1, BLz - k * 0.2],
      [BLx - (TLx - BLx) * (k / LENS_H), BLz + k],
    ])
    // Left slanted side up to top-left corner zone
    .lineTo(TLx, TLz - k)
    // Top-left corner spline
    .spline([
      [TLx, TLz - k],
      [TLx - k * 0.2, TLz - k * 0.4],
      [TLx + k, TLz],
    ])
    .close();
}

const rightLensCutout = lensCutoutSketch(1)
  .extrude(FRAME_DEPTH + 6)
  .rotate([1, 0, 0], 90)
  .translate(0, FRAME_DEPTH + 3, 0);

const leftLensCutout = lensCutoutSketch(-1)
  .extrude(FRAME_DEPTH + 6)
  .rotate([1, 0, 0], 90)
  .translate(0, FRAME_DEPTH + 3, 0);

// ----------------------------------------------------------------------------
// V-notch nose cut — small inverted V cut into the bridge from BELOW.
// The triangle's top edge sits BELOW the brow so the cut does NOT reach the
// brow silhouette — gives the iconic small V saddle between the two lenses.
// Apex points DOWN toward the wearer's nose; the opening is along the bridge
// top (just below the brow line).
// ----------------------------------------------------------------------------
const noseNotch = path()
  .moveTo(-NOSE_NOTCH_HALF_W, NOSE_NOTCH_TOP_Z)
  .lineTo(NOSE_NOTCH_HALF_W, NOSE_NOTCH_TOP_Z)
  .lineTo(0, NOSE_NOTCH_TOP_Z - NOSE_NOTCH_DEPTH)
  .close()
  .extrude(FRAME_DEPTH + 6)
  .rotate([1, 0, 0], 90)
  .translate(0, FRAME_DEPTH + 3, 0);

// ----------------------------------------------------------------------------
// Camera + LED bores — on the LEFT lens upper-outer corner.
// ----------------------------------------------------------------------------
const CAM_X = -LENS_CX - LENS_TOP_W / 2 + CAMERA_R + 1; // inboard from outer edge
const CAM_Z = LENS_CZ + LENS_H / 2 + (FRAME_Z_TOP - LENS_CZ - LENS_H / 2) / 2 - 1;

const cameraCounterbore = cylinder(CAMERA_DEPTH + 0.5, CAMERA_R, 64)
  .alongAxis([0, 1, 0])
  .translate(CAM_X, -0.25, CAM_Z);

const LED_X = CAM_X + CAMERA_R + 5;
const LED_Z = CAM_Z;
const ledPocket = cylinder(LED_DEPTH + 0.2, LED_R, 32)
  .alongAxis([0, 1, 0])
  .translate(LED_X, -0.1, LED_Z);

// ----------------------------------------------------------------------------
// Compose body — apply acetate material LAST on the head record (per
// `kernelcad_material_after_union_pitfall`: leaf materials don't survive
// .union()/.subtract(); only the head's material reaches the renderer).
// ----------------------------------------------------------------------------
const bodyShape = body
  .subtract(rightLensCutout)
  .subtract(leftLensCutout)
  .subtract(noseNotch)
  .subtract(cameraCounterbore)
  .subtract(ledPocket)
  .translate(0, -FRAME_DEPTH / 2, 0)  // center on Y for framing
  .material({
    baseColor: '#1a1a1a',
    metalness: 0.0,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    ior: 1.55,
  });

// ----------------------------------------------------------------------------
// Lens inserts — dark tinted discs sitting just behind the front face of the
// frame, filling the cutout interior. Authored via the SAME spline cutout
// sketch (extruded thin) so the insert matches the opening exactly.
// Material applied PRE-union (assembly fan-out preserves per-part PBR).
// ----------------------------------------------------------------------------
const LENS_INSERT_T = 1.2;
function lensInsertShape(signX: 1 | -1) {
  return lensCutoutSketch(signX)
    .extrude(LENS_INSERT_T)
    .rotate([1, 0, 0], 90)
    .translate(0, FRAME_DEPTH / 2 + 0.5, -FRAME_DEPTH / 2)
    .material({
      baseColor: '#0c0e10',
      metalness: 0.0,
      roughness: 0.10,
      clearcoat: 0.9,
      clearcoatRoughness: 0.04,
      ior: 1.5,
    });
}

const rightLensInsert = lensInsertShape(1);
const leftLensInsert = lensInsertShape(-1);

// Camera lens — small dark disc inside the counterbore.
const CAMERA_INNER_R = 3.0;
const cameraLens = cylinder(0.6, CAMERA_INNER_R, 48)
  .alongAxis([0, 1, 0])
  .translate(CAM_X, -FRAME_DEPTH / 2 + CAMERA_DEPTH - 0.6, CAM_Z)
  .material({
    baseColor: '#050608',
    metalness: 0.05,
    roughness: 0.08,
    clearcoat: 0.95,
    clearcoatRoughness: 0.03,
  });

// ----------------------------------------------------------------------------
// Assemble — per-part materials survive into the static render via the
// assembly fan-out path (see featureMeshing.ts MaterialShadowingWarning).
// Joints are `fixed` (no kinematic motion); the assembly is purely a
// material-preservation container.
// ----------------------------------------------------------------------------
const glasses = assembly('ray-ban-meta-wayfarer');
const bodyPart = glasses.part('acetate-body', bodyShape);
const rightInsertPart = glasses.part('right-lens-insert', rightLensInsert);
const leftInsertPart = glasses.part('left-lens-insert', leftLensInsert);
const cameraPart = glasses.part('camera-lens', cameraLens);

glasses.fixed('right-insert-in-frame', bodyPart, rightInsertPart, { origin: [0, 0, 0] });
glasses.fixed('left-insert-in-frame',  bodyPart, leftInsertPart,  { origin: [0, 0, 0] });
glasses.fixed('camera-in-frame',        bodyPart, cameraPart,      { origin: [0, 0, 0] });

return glasses.model();
