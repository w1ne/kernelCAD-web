// Integrated Ray-Ban Meta / Wayfarer candidate.
//
// Built from the three parallel experiments:
// - words-to-geometry-wayfarer: best prompt traceability and rounded openings
// - product-detail-wayfarer: best physical Meta cues and seated inserts
// - silhouette-wayfarer: useful wing/cheek proportion checks
//
// Coordinate convention: X = left/right, Z = up, smallest Y is the
// camera-facing front surface. Sketches are authored in X/Z and extruded into Y.

const FRAME_DEPTH = 9.2;
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
const CAMERA_BEZEL_R = 4.65;
const CAMERA_INNER_R = 2.45;
const CAMERA_X = -LENS_OUTER_TOP_X + 7.4;
const CAMERA_Z = LENS_TOP_Z + 4.4;
const LED_R = 0.9;
const LED_X = CAMERA_X + CAMERA_R + 6.6;
const LED_Z = CAMERA_Z + 0.1;

const ACETATE = {
  baseColor: '#202224',
  metalness: 0,
  roughness: 0.25,
  clearcoat: 0.82,
  clearcoatRoughness: 0.07,
  ior: 1.55,
};

const SMOKED_LENS = {
  baseColor: '#253631',
  metalness: 0,
  roughness: 0.12,
  clearcoat: 0.72,
  clearcoatRoughness: 0.04,
  ior: 1.5,
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

function lensOpening(sign: 1 | -1, inset = 0) {
  const innerTopX = sign * (LENS_INNER_TOP_X + inset);
  const outerTopX = sign * (LENS_OUTER_TOP_X - inset);
  const innerBotX = sign * (LENS_INNER_BOT_X + inset);
  const outerBotX = sign * (LENS_OUTER_BOT_X - inset);
  const topZ = LENS_TOP_Z - inset * 0.35;
  const botZ = LENS_BOT_Z + inset * 0.65;
  const outerTopR = 7.0;
  const innerTopR = 4.3;
  const innerBotR = 5.5;
  const outerBotR = 6.3;

  if (sign === 1) {
    return path()
      .moveTo(innerTopX + innerTopR, topZ)
      .lineTo(outerTopX - outerTopR, topZ)
      .tangentArc(outerTopX, topZ - outerTopR)
      .lineTo(outerBotX, botZ + outerBotR)
      .tangentArc(outerBotX - outerBotR, botZ)
      .lineTo(innerBotX + innerBotR, botZ)
      .tangentArc(innerBotX, botZ + innerBotR)
      .lineTo(innerTopX, topZ - innerTopR)
      .tangentArc(innerTopX + innerTopR, topZ)
      .close();
  }

  return path()
    .moveTo(innerTopX - innerTopR, topZ)
    .lineTo(outerTopX + outerTopR, topZ)
    .tangentArc(outerTopX, topZ - outerTopR)
    .lineTo(outerBotX, botZ + outerBotR)
    .tangentArc(outerBotX + outerBotR, botZ)
    .lineTo(innerBotX - innerBotR, botZ)
    .tangentArc(innerBotX, botZ + innerBotR)
    .lineTo(innerTopX, topZ - innerTopR)
    .tangentArc(innerTopX - innerTopR, topZ)
    .close();
}

// "chunky black acetate body" + "smoothly curved Wayfarer wing corners"
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

// "two trapezoidal lens openings" with rounded corners and a shallow front
// rebate so the separate smoked lens inserts read as seated parts.
const leftLensCut = frontBody(lensOpening(-1), FRAME_DEPTH + 6, -3);
const rightLensCut = frontBody(lensOpening(1), FRAME_DEPTH + 6, -3);
const leftLensSeat = frontBody(lensOpening(-1, 1.55), 1.0, 0.05);
const rightLensSeat = frontBody(lensOpening(1, 1.55), 1.0, 0.05);

// "small bridge" + "nose notch"
const noseNotch = path()
  .moveTo(-NOSE_NOTCH_W / 2, FRAME_BOT_Z - 0.8)
  .lineTo(NOSE_NOTCH_W / 2, FRAME_BOT_Z - 0.8)
  .lineTo(0, FRAME_BOT_Z + NOSE_NOTCH_DEPTH)
  .close();
const noseCut = frontBody(noseNotch, FRAME_DEPTH + 6, -3);

// "asymmetric left camera+LED"
const cameraCounterbore = yCylinder(3.0, CAMERA_BEZEL_R, 72).translate(CAMERA_X, -0.35, CAMERA_Z);
const cameraInnerPocket = yCylinder(3.35, CAMERA_INNER_R, 56).translate(CAMERA_X, -0.55, CAMERA_Z);
const ledPocket = yCylinder(1.1, LED_R + 0.2, 32).translate(LED_X, -0.25, LED_Z);

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

const frame = acetateBlank
  .subtract(leftLensCut)
  .subtract(rightLensCut)
  .subtract(leftLensSeat)
  .subtract(rightLensSeat)
  .subtract(noseCut)
  .subtract(cameraCounterbore)
  .subtract(cameraInnerPocket)
  .subtract(ledPocket)
  .subtract(browRelief)
  .translate(0, CENTER_Y, 0)
  .material(ACETATE)
  .color('#202224');

function lensInsert(sign: 1 | -1) {
  return frontBody(lensOpening(sign, 2.05), 0.82, 1.22)
    .translate(0, CENTER_Y, 0)
    .material(SMOKED_LENS)
    .color('#253631');
}

const cameraBezel = yCylinder(0.92, CAMERA_BEZEL_R - 0.35, 72)
  .translate(CAMERA_X, CENTER_Y - 0.04, CAMERA_Z)
  .material({
    baseColor: '#08090a',
    metalness: 0,
    roughness: 0.18,
    clearcoat: 0.55,
    clearcoatRoughness: 0.05,
  })
  .color('#08090a');

const cameraGlass = yCylinder(0.72, CAMERA_INNER_R, 56)
  .translate(CAMERA_X, CENTER_Y - 0.1, CAMERA_Z)
  .material({
    baseColor: '#05070a',
    metalness: 0,
    roughness: 0.07,
    clearcoat: 0.9,
    clearcoatRoughness: 0.02,
    ior: 1.7,
  })
  .color('#05070a');

const cameraHighlight = yCylinder(0.12, 0.62, 20)
  .translate(CAMERA_X - 0.75, CENTER_Y - 0.18, CAMERA_Z + 0.8)
  .material({
    baseColor: '#67727b',
    metalness: 0,
    roughness: 0.2,
    clearcoat: 0.2,
  })
  .color('#67727b');

const ledDiffuser = yCylinder(0.64, LED_R, 32)
  .translate(LED_X, CENTER_Y - 0.08, LED_Z)
  .material({
    baseColor: '#d15a34',
    metalness: 0,
    roughness: 0.18,
    clearcoat: 0.45,
    clearcoatRoughness: 0.06,
  })
  .color('#d15a34');

const noseShadow = frontBody(
  path()
    .moveTo(-4.2, FRAME_BOT_Z + 0.3)
    .lineTo(4.2, FRAME_BOT_Z + 0.3)
    .lineTo(0, FRAME_BOT_Z + 4.8)
    .close(),
  0.42,
  -0.15,
)
  .translate(0, CENTER_Y, 0)
  .material({
    baseColor: '#0e0e0e',
    metalness: 0,
    roughness: 0.38,
    clearcoat: 0.2,
  })
  .color('#101010');

return [
  { name: 'words to geometry chunky black acetate frame', shape: frame },
  { name: 'left smoked seated lens insert', shape: lensInsert(-1) },
  { name: 'right smoked seated lens insert', shape: lensInsert(1) },
  { name: 'left recessed Meta camera bezel', shape: cameraBezel },
  { name: 'left recessed Meta camera glass', shape: cameraGlass },
  { name: 'camera highlight seated inside glass', shape: cameraHighlight },
  { name: 'small amber privacy LED toward bridge', shape: ledDiffuser },
  { name: 'dark inverted V bridge nose notch shadow', shape: noseShadow },
];
