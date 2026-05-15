// Real Object Brief
// Artifact: Ray-Ban Meta — Wayfarer smart glasses, front-face only.
//   Reference: gallery prompt scripts/demo-prompts/gallery-meta-glasses.md.
// Scale: millimetres. Frame envelope 142 mm wide × 46 mm tall × 6 mm deep.
//   Wayfarer lens opening: top edge ~56 mm wide, bottom edge ~36 mm; height ~36 mm.
//   Bridge gap: 14 mm at top, widens to 20 mm at bottom (the "nose notch" is the
//   natural gap between the two trapezoid feet, not a separate cutout).
//   Dark lens inserts: trapezoidal slabs (1.4 mm deep) recessed 1.2 mm
//   inside each lens cavity. Camera bumps: r=2.4 mm cylinders, h=1.8 mm at the
//   outer-upper corners of the front face. LED dot: r=0.9 mm at right side near bridge.
// Visible facts (from reference photo):
//   1. Solid Wayfarer rim — chunky, matte body; not a wireframe.
//   2. Two trapezoidal lens openings, mirror symmetric about the bridge midline.
//   3. Dark lens inserts visibly recessed inside each opening.
//   4. Two small camera bumps protruding forward from the upper-outer corners.
//   5. Single LED indicator dot on the right lens, near the bridge.
//   6. Bridge with nose-notch shape (narrower at top, wider at bottom).
// Hidden-side inference: temples / hinges OMITTED per brief (v1 = front-face only).
//   Bounding box stays X-dominant for clean renderer auto-framing.
// Validation focus: front view reads as Wayfarer smart glasses on first glance —
//   trapezoidal lenses are filled (not hollow rims), camera bumps + LED visible,
//   bridge nose-notch readable. Iso view shows the front face thickness.
//
// Coordinate convention: Z-up, right-handed. Render's "front" view looks from -Y
// toward +Y. Front face at Y = -FRAME_DEPTH/2, back at Y = +FRAME_DEPTH/2.

// ─── Dimensions ────────────────────────────────────────────────────────────
const FRAME_DEPTH      = 6;
const BRIDGE_TOP       = 14;
const BRIDGE_BOT       = 20;
const LENS_TOP_W       = 56;
const LENS_BOT_W       = 36;
const LENS_H           = 36;
const RIM_BORDER       = 5;

const LENS_Z_BOT       = -(LENS_H / 2);     // -18
const LENS_Z_TOP       = +(LENS_H / 2);     // +18
const FRAME_Z_BOT      = LENS_Z_BOT - RIM_BORDER;   // -23
const FRAME_Z_TOP      = LENS_Z_TOP + RIM_BORDER;   // +23
const FRAME_HALF_W     = (BRIDGE_TOP / 2) + LENS_TOP_W + RIM_BORDER;  // 7+56+5 = 68

const LENS_INSERT_DEPTH   = 1.4;
const LENS_INSERT_INSET   = 1.0;
const LENS_INSERT_SHRINK  = 0.4;

const CAMERA_R         = 2.4;
const CAMERA_H         = 1.8;

const LED_R            = 0.9;
const LED_H            = 0.5;

const FRONT_Y          = -(FRAME_DEPTH / 2);  // -3, smallest Y = closest to camera

// ─── Sketch-to-world helper ───────────────────────────────────────────────────
// path() builds in sketch XY; .extrude(d) extrudes +Z (sketch normal).
// rotate([1,0,0],-90°): (x, y_sketch, z_sketch) → (x, z_sketch, -y_sketch).
// So sketch.x → world.x, sketch.y → -world.z, sketch.z (extrude) → world.y.
// We pass sketch.y = -Z_world so world Z = intended Z, and extrude depth becomes world Y.
function xzPanel(points: [number, number][], depth: number, yFront: number) {
  let p = path().moveTo(points[0][0], -points[0][1]);
  for (let i = 1; i < points.length; i++) {
    p = p.lineTo(points[i][0], -points[i][1]);
  }
  return p.close().extrude(depth).rotate([1, 0, 0], -90).translate(0, yFront, 0);
}

// ─── Additive frame: 5 panels unioned in XZ, extruded in Y ──────────────────
// Each (x, z) coordinate is the world position; xzPanel handles the sketch flip.

// Top rim: full width, Z from LENS_Z_TOP to FRAME_Z_TOP.
const topRim = xzPanel(
  [
    [-FRAME_HALF_W, FRAME_Z_TOP],
    [ FRAME_HALF_W, FRAME_Z_TOP],
    [ FRAME_HALF_W, LENS_Z_TOP],
    [-FRAME_HALF_W, LENS_Z_TOP],
  ],
  FRAME_DEPTH,
  FRONT_Y,
);

// Bottom rim: full width, Z from FRAME_Z_BOT to LENS_Z_BOT.
const bottomRim = xzPanel(
  [
    [-FRAME_HALF_W, LENS_Z_BOT],
    [ FRAME_HALF_W, LENS_Z_BOT],
    [ FRAME_HALF_W, FRAME_Z_BOT],
    [-FRAME_HALF_W, FRAME_Z_BOT],
  ],
  FRAME_DEPTH,
  FRONT_Y,
);

// Outer rim — Wayfarer angled piece, mirror-symmetric. Built for xSign = +1.
// Outer X at top/bot: FRAME_HALF_W (=68). Inner X follows the trapezoid taper.
// At Z=LENS_Z_TOP: inner X = BRIDGE_TOP/2 + LENS_TOP_W = 63 (so rim width = 5 at top).
// At Z=LENS_Z_BOT: inner X = BRIDGE_BOT/2 + LENS_BOT_W = 46 (so rim width = 22 at bot).
function outerRim(xSign: -1 | 1) {
  const outerX = xSign * FRAME_HALF_W;
  const innerXTop = xSign * (BRIDGE_TOP / 2 + LENS_TOP_W);
  const innerXBot = xSign * (BRIDGE_BOT / 2 + LENS_BOT_W);
  // Build CCW for xSign = +1 (right side): top-outer → top-inner → bot-inner → bot-outer.
  // For xSign = -1 (left side), reverse to keep CCW after mirroring.
  const pts: [number, number][] =
    xSign > 0
      ? [
          [outerX,     LENS_Z_TOP],
          [innerXTop,  LENS_Z_TOP],
          [innerXBot,  LENS_Z_BOT],
          [outerX,     LENS_Z_BOT],
        ]
      : [
          [outerX,     LENS_Z_TOP],
          [outerX,     LENS_Z_BOT],
          [innerXBot,  LENS_Z_BOT],
          [innerXTop,  LENS_Z_TOP],
        ];
  return xzPanel(pts, FRAME_DEPTH, FRONT_Y);
}

const leftOuterRim  = outerRim(-1);
const rightOuterRim = outerRim(1);

// Bridge: between the two lenses, narrower at top (14) widens to bottom (20).
const bridge = xzPanel(
  [
    [-(BRIDGE_TOP / 2), LENS_Z_TOP],
    [ (BRIDGE_TOP / 2), LENS_Z_TOP],
    [ (BRIDGE_BOT / 2), LENS_Z_BOT],
    [-(BRIDGE_BOT / 2), LENS_Z_BOT],
  ],
  FRAME_DEPTH,
  FRONT_Y,
);

let glasses = topRim
  .union(bottomRim)
  .union(leftOuterRim)
  .union(rightOuterRim)
  .union(bridge);

// Lens openings stay hollow — the dark background reads as the dark Wayfarer
// lens against the grey frame. A thin recessed insert was tried but read as a
// flush groove at this render resolution; an empty opening is more legible.

// ─── Camera bumps — Meta signature, front face outer-upper corners ──────────
const BUMP_X = (BRIDGE_TOP / 2) + LENS_TOP_W - 1.5;
const BUMP_Z = LENS_Z_TOP + 1.5;

function cameraBump(xSign: -1 | 1) {
  return cylinder(CAMERA_H, CAMERA_R, 48)
    .alongAxis([0, 1, 0])
    .translate(xSign * BUMP_X, FRONT_Y - CAMERA_H, BUMP_Z);
}

glasses = glasses.union(cameraBump(-1)).union(cameraBump(1));

// ─── LED indicator dot (right side, near bridge) ────────────────────────────
const LED_X = (BRIDGE_TOP / 2) + 5;
const LED_Z = LENS_Z_TOP - 5;

const led = cylinder(LED_H, LED_R, 24)
  .alongAxis([0, 1, 0])
  .translate(LED_X, FRONT_Y - LED_H, LED_Z);

glasses = glasses.union(led);

return glasses;
