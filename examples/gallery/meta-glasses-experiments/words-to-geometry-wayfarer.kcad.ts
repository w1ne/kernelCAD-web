// Experimental Ray-Ban Meta / Wayfarer front-face variant.
//
// Goal: prompt-to-geometry traceability. Each important prompt phrase below has
// an explicit geometry block with the same phrase in its heading.
//
// Coordinate convention: X = left/right, Z = up, and the smallest Y is the
// camera-facing front surface. Sketches are authored in X/Z and extruded into Y.
//
// Phrase map:
// - "chunky black acetate body" -> one thick, glossy, dark frame blank.
// - "smoothly curved Wayfarer wing corners" -> raised outer wing peaks and
//   spline/sagitta arcs in the outer silhouette, not rectangular chamfers.
// - "two trapezoidal lens openings" -> two subtractive tapered lens cutouts,
//   wider at the top than bottom with rounded lower/inner corners.
// - "asymmetric left camera+LED" -> only the negative-X side gets a circular
//   camera counterbore plus a smaller LED pocket toward the bridge.
// - "small bridge" -> 16 mm bridge gap between lens inner top edges.
// - "nose notch" -> narrow inverted V cut from the lower bridge.
// - "front face only" -> no temples; shallow frame depth only.

const FRAME_DEPTH = 9.0;
const CENTER_Y = -FRAME_DEPTH / 2;

const FRAME_HALF_W = 75;
const FRAME_TOP_Z = 25;
const FRAME_BOT_Z = -26;
const WING_TIP_X = 80;
const WING_TIP_Z = 28;
const SIDE_CHEEK_X = 74;
const SIDE_CHEEK_Z = 11;
const LOWER_CHEEK_X = 64;
const LOWER_CHEEK_Z = -23;
const BRIDGE_BOTTOM_Z = -25.5;

const BRIDGE_GAP = 16;
const LENS_TOP_W = 52;
const LENS_BOT_W = 41;
const LENS_H = 37;
const LENS_TOP_Z = 17;
const LENS_BOT_Z = LENS_TOP_Z - LENS_H;
const LENS_INNER_TOP_X = BRIDGE_GAP / 2;
const LENS_OUTER_TOP_X = LENS_INNER_TOP_X + LENS_TOP_W;
const LENS_INNER_BOT_X = LENS_INNER_TOP_X + (LENS_TOP_W - LENS_BOT_W) / 2;
const LENS_OUTER_BOT_X = LENS_INNER_BOT_X + LENS_BOT_W;

const NOSE_NOTCH_W = 8.0;
const NOSE_NOTCH_DEPTH = 5.0;

const CAMERA_R = 4.1;
const CAMERA_INNER_R = 2.45;
const CAMERA_X = -LENS_OUTER_TOP_X + 7.4;
const CAMERA_Z = LENS_TOP_Z + 4.4;
const LED_R = 0.85;
const LED_X = CAMERA_X + CAMERA_R + 6.6;
const LED_Z = CAMERA_Z + 0.1;

const ACETATE = {
  baseColor: '#242424',
  metalness: 0,
  roughness: 0.28,
  clearcoat: 0.72,
  clearcoatRoughness: 0.09,
  ior: 1.55,
};

function frontBody(sketch, depth = FRAME_DEPTH, yOffset = 0) {
  return sketch
    .extrude(depth)
    .rotate([1, 0, 0], 90)
    .translate(0, depth + yOffset, 0);
}

function yCylinder(depth, radius, segments = 48) {
  return cylinder(depth, radius, segments).alongAxis([0, 1, 0]);
}

function lensOpening(sign: 1 | -1) {
  const innerTopX = sign * LENS_INNER_TOP_X;
  const outerTopX = sign * LENS_OUTER_TOP_X;
  const innerBotX = sign * LENS_INNER_BOT_X;
  const outerBotX = sign * LENS_OUTER_BOT_X;
  const outerTopR = 7.0;
  const innerTopR = 4.3;
  const innerBotR = 5.5;
  const outerBotR = 6.3;

  if (sign === 1) {
    return path()
      .moveTo(innerTopX + innerTopR, LENS_TOP_Z)
      .lineTo(outerTopX - outerTopR, LENS_TOP_Z)
      .tangentArc(outerTopX, LENS_TOP_Z - outerTopR)
      .lineTo(outerBotX, LENS_BOT_Z + outerBotR)
      .tangentArc(outerBotX - outerBotR, LENS_BOT_Z)
      .lineTo(innerBotX + innerBotR, LENS_BOT_Z)
      .tangentArc(innerBotX, LENS_BOT_Z + innerBotR)
      .lineTo(innerTopX, LENS_TOP_Z - innerTopR)
      .tangentArc(innerTopX + innerTopR, LENS_TOP_Z)
      .close();
  }

  return path()
    .moveTo(innerTopX - innerTopR, LENS_TOP_Z)
    .lineTo(outerTopX + outerTopR, LENS_TOP_Z)
    .tangentArc(outerTopX, LENS_TOP_Z - outerTopR)
    .lineTo(outerBotX, LENS_BOT_Z + outerBotR)
    .tangentArc(outerBotX + outerBotR, LENS_BOT_Z)
    .lineTo(innerBotX - innerBotR, LENS_BOT_Z)
    .tangentArc(innerBotX, LENS_BOT_Z + innerBotR)
    .lineTo(innerTopX, LENS_TOP_Z - innerTopR)
    .tangentArc(innerTopX - innerTopR, LENS_TOP_Z)
    .close();
}

// "chunky black acetate body" + "smoothly curved Wayfarer wing corners"
// A single broad outline forms the acetate front. The high outer wing peaks,
// curved brow, curved lower cheeks, and rounded bottom keep this out of
// rectangle-with-chamfers territory.
const acetateOutline = path()
  .moveTo(-WING_TIP_X, WING_TIP_Z)
  .spline([
    [-WING_TIP_X, WING_TIP_Z],
    [-FRAME_HALF_W, FRAME_TOP_Z - 1.0],
    [-SIDE_CHEEK_X, SIDE_CHEEK_Z],
    [-LOWER_CHEEK_X, LOWER_CHEEK_Z],
    [-18, BRIDGE_BOTTOM_Z],
    [0, FRAME_BOT_Z],
  ])
  .spline([
    [0, FRAME_BOT_Z],
    [18, BRIDGE_BOTTOM_Z],
    [LOWER_CHEEK_X, LOWER_CHEEK_Z],
    [SIDE_CHEEK_X, SIDE_CHEEK_Z],
    [FRAME_HALF_W, FRAME_TOP_Z - 1.0],
    [WING_TIP_X, WING_TIP_Z],
  ])
  .spline([
    [WING_TIP_X, WING_TIP_Z],
    [59, FRAME_TOP_Z + 0.2],
    [31, FRAME_TOP_Z + 1.2],
    [0, FRAME_TOP_Z + 0.6],
    [-31, FRAME_TOP_Z + 1.2],
    [-59, FRAME_TOP_Z + 0.2],
    [-WING_TIP_X, WING_TIP_Z],
  ])
  .close();

const acetateBlank = frontBody(acetateOutline);

// "two trapezoidal lens openings"
// These are through-cuts. Top width is 52 mm, bottom width is 41 mm, so the
// taper is visible even before rendering. The rounded corners come from arcs.
const leftLensCut = frontBody(lensOpening(-1), FRAME_DEPTH + 6, -3);
const rightLensCut = frontBody(lensOpening(1), FRAME_DEPTH + 6, -3);

// Optional shallow lip cuts around the openings make the lens holes readable
// as seated rim geometry while keeping the returned object a single Shape.
const leftLensRelief = frontBody(lensOpening(-1), 1.0, -0.15);
const rightLensRelief = frontBody(lensOpening(1), 1.0, -0.15);

// "small bridge" + "nose notch"
// The bridge is the material between the two inner lens edges. This inverted V
// removes only a narrow saddle from the lower bridge, leaving the heavy brow.
const noseNotch = path()
  .moveTo(-NOSE_NOTCH_W / 2, FRAME_BOT_Z - 0.8)
  .lineTo(NOSE_NOTCH_W / 2, FRAME_BOT_Z - 0.8)
  .lineTo(0, FRAME_BOT_Z + NOSE_NOTCH_DEPTH)
  .close();
const noseCut = frontBody(noseNotch, FRAME_DEPTH + 6, -3);

// "asymmetric left camera+LED"
// Negative X is left. There is intentionally no mirrored feature on +X.
const cameraCounterbore = yCylinder(3.1, CAMERA_R, 72).translate(CAMERA_X, -0.35, CAMERA_Z);
const cameraInnerPocket = yCylinder(3.35, CAMERA_INNER_R, 56).translate(CAMERA_X, -0.55, CAMERA_Z);
const cameraBrightRing = yCylinder(0.55, CAMERA_R + 0.45, 72).translate(CAMERA_X, -0.18, CAMERA_Z);
const ledPocket = yCylinder(1.1, LED_R, 32).translate(LED_X, -0.25, LED_Z);

// Thin front bevel/relief groove on the upper brow: this reinforces the
// "chunky acetate" face as a thick molded front, not a flat 2D cutout.
const browRelief = frontBody(
  path()
    .moveTo(-WING_TIP_X + 8, FRAME_TOP_Z - 1.0)
    .sagittaArc(0, FRAME_TOP_Z - 2.0, -0.75)
    .sagittaArc(WING_TIP_X - 8, FRAME_TOP_Z - 1.0, -0.75)
    .lineTo(WING_TIP_X - 8, FRAME_TOP_Z - 2.7)
    .sagittaArc(0, FRAME_TOP_Z - 3.8, 0.55)
    .sagittaArc(-WING_TIP_X + 8, FRAME_TOP_Z - 2.7, 0.55)
    .close(),
  0.9,
  -0.12,
);

// "front face only"
// Compose a single Shape: shallow frame depth, no temples or hinge arms.
const glasses = acetateBlank
  .subtract(leftLensCut)
  .subtract(rightLensCut)
  .subtract(leftLensRelief)
  .subtract(rightLensRelief)
  .subtract(noseCut)
  .subtract(cameraBrightRing)
  .subtract(cameraCounterbore)
  .subtract(cameraInnerPocket)
  .subtract(ledPocket)
  .subtract(browRelief)
  .translate(0, CENTER_Y, 0)
  .material(ACETATE);

return glasses;
