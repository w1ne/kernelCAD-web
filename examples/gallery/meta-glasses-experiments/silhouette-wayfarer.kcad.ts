// Experimental Ray-Ban Meta / Wayfarer front-face variant.
//
// Hypothesis: the scorer and human read both need a stronger front silhouette
// before small Meta hardware details matter. This variant pushes the Wayfarer
// brow, upper-outer wing lift, trapezoid lens openings, and lower bridge/nose
// notch harder than the gallery hero while keeping the model source-first and
// easy to inspect.
//
// Coordinate convention: Z-up, X left/right, smallest Y is camera-facing.
// Sketches are authored in X/Z coordinates, extruded, then rotated into the
// world XZ front plane.

const FRAME_DEPTH = 9;

const FRAME_HALF_W = 77;
const FRAME_TOP_Z = 25;
const FRAME_BOT_Z = -27;
const WING_X = 80;
const WING_Z = 28;
const OUTER_CHEEK_X = 75;
const OUTER_CHEEK_Z = 14;
const LOWER_CHEEK_X = 66;
const LOWER_CHEEK_Z = -24;
const BOTTOM_NECK_X = 17;
const BOTTOM_NECK_Z = -25;

const BRIDGE_GAP = 16;
const LENS_TOP_W = 52;
const LENS_BOT_W = 42;
const LENS_H = 38;
const LENS_TOP_Z = 17;
const LENS_BOT_Z = LENS_TOP_Z - LENS_H;
const LENS_INNER_TOP_X = BRIDGE_GAP / 2;
const LENS_OUTER_TOP_X = LENS_INNER_TOP_X + LENS_TOP_W;
const LENS_INNER_BOT_X = LENS_INNER_TOP_X + 6;
const LENS_OUTER_BOT_X = LENS_INNER_BOT_X + LENS_BOT_W;

const NOSE_NOTCH_W = 13;
const NOSE_NOTCH_APEX_Z = -9;
const NOSE_NOTCH_BASE_Z = FRAME_BOT_Z - 3;

const CAMERA_R = 4.2;
const CAMERA_X = -LENS_OUTER_TOP_X + 7.5;
const CAMERA_Z = LENS_TOP_Z + 4.2;
const LED_R = 0.9;
const LED_X = CAMERA_X + 11.5;

function frontExtrude(sketch: Sketch, depth = FRAME_DEPTH) {
  return sketch
    .extrude(depth)
    .rotate([1, 0, 0], 90)
    .translate(0, depth, 0);
}

function throughFrontCutter(sketch: Sketch) {
  return sketch
    .extrude(FRAME_DEPTH + 6)
    .rotate([1, 0, 0], 90)
    .translate(0, FRAME_DEPTH + 3, 0);
}

// Full outer perimeter with deliberately readable Wayfarer cues:
// high outer wings, a broad arcing brow, pinched lower cheeks, and a gently
// concave lower run toward the bridge.
const outerSilhouette = path()
  .moveTo(-WING_X, WING_Z)
  .spline([
    [-WING_X, WING_Z],
    [-FRAME_HALF_W, 24],
    [-OUTER_CHEEK_X, OUTER_CHEEK_Z],
    [-LOWER_CHEEK_X, LOWER_CHEEK_Z],
    [-BOTTOM_NECK_X, BOTTOM_NECK_Z],
    [0, FRAME_BOT_Z],
  ])
  .spline([
    [0, FRAME_BOT_Z],
    [BOTTOM_NECK_X, BOTTOM_NECK_Z],
    [LOWER_CHEEK_X, LOWER_CHEEK_Z],
    [OUTER_CHEEK_X, OUTER_CHEEK_Z],
    [FRAME_HALF_W, 24],
    [WING_X, WING_Z],
  ])
  .spline([
    [WING_X, WING_Z],
    [56, FRAME_TOP_Z],
    [28, FRAME_TOP_Z + 1.5],
    [0, FRAME_TOP_Z + 0.8],
    [-28, FRAME_TOP_Z + 1.5],
    [-56, FRAME_TOP_Z],
    [-WING_X, WING_Z],
  ])
  .close();

function lensOpening(sign: 1 | -1) {
  const innerTopX = sign * LENS_INNER_TOP_X;
  const outerTopX = sign * LENS_OUTER_TOP_X;
  const innerBotX = sign * LENS_INNER_BOT_X;
  const outerBotX = sign * LENS_OUTER_BOT_X;

  // Keep the cutters deliberately simple and robust: exact trapezoids are the
  // hard visual requirement for this experiment, while rounded corners can be
  // layered back in by a later variant after the silhouette is proven.
  if (sign === 1) {
    return path()
      .moveTo(innerTopX, LENS_TOP_Z)
      .lineTo(outerTopX, LENS_TOP_Z)
      .lineTo(outerBotX, LENS_BOT_Z)
      .lineTo(innerBotX, LENS_BOT_Z)
      .close();
  }

  return path()
    .moveTo(innerTopX, LENS_TOP_Z)
    .lineTo(innerBotX, LENS_BOT_Z)
    .lineTo(outerBotX, LENS_BOT_Z)
    .lineTo(outerTopX, LENS_TOP_Z)
    .close();
}

// A lower bridge bite is more visually faithful to the front-face prompt than
// a top-edge notch: it opens the nose saddle while preserving the heavy brow.
const noseNotch = path()
  .moveTo(-NOSE_NOTCH_W / 2, NOSE_NOTCH_BASE_Z)
  .lineTo(NOSE_NOTCH_W / 2, NOSE_NOTCH_BASE_Z)
  .lineTo(0, NOSE_NOTCH_APEX_Z)
  .close();

const body = frontExtrude(outerSilhouette);
const leftLensCut = throughFrontCutter(lensOpening(-1));
const rightLensCut = throughFrontCutter(lensOpening(1));
const noseCut = throughFrontCutter(noseNotch);

const cameraCounterbore = cylinder(3.0, CAMERA_R, 64)
  .alongAxis([0, 1, 0])
  .translate(CAMERA_X, -0.4, CAMERA_Z);
const cameraGlass = cylinder(0.7, 2.5, 48)
  .alongAxis([0, 1, 0])
  .translate(CAMERA_X, 1.7, CAMERA_Z);
const ledPocket = cylinder(1.0, LED_R, 32)
  .alongAxis([0, 1, 0])
  .translate(LED_X, -0.3, CAMERA_Z);

const glasses = body
  .subtract(leftLensCut)
  .subtract(rightLensCut)
  .subtract(noseCut)
  .subtract(cameraCounterbore)
  .subtract(ledPocket)
  .union(cameraGlass)
  .translate(0, -FRAME_DEPTH / 2, 0)
  .material({
    baseColor: '#343434',
    metalness: 0.0,
    roughness: 0.32,
    clearcoat: 0.45,
    clearcoatRoughness: 0.12,
    ior: 1.5,
  });

return glasses;
