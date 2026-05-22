// Ray-Ban Meta / Wayfarer front-face experiment — product-detail variant.
//
// Hypothesis: keep the recognizable Wayfarer silhouette from the gallery
// artifact, but make the source text map visibly to product geometry:
// black glossy acetate, seated smoked lens inserts, recessed left-side camera,
// a smaller status LED, bevel/groove cues, and a readable bridge/nose notch.
//
// Coordinates: Z-up, X left/right, +Y goes into the frame. The camera-facing
// front surface is the smallest Y after the final centering translate.

const FRAME_DEPTH = 9.5;
const BODY_Y_CENTERING = -FRAME_DEPTH / 2;

const BRIDGE_W = 16;
const HALF_BRIDGE = BRIDGE_W / 2;

const LENS_TOP_W = 50;
const LENS_BOT_W = 39;
const LENS_H = 38;

const RIM_TOP = 8.2;
const RIM_BOT = 8.5;
const RIM_OUTER = 7.2;
const WING_RISE = 3.1;

const LENS_Z_TOP = LENS_H / 2;
const LENS_Z_BOT = -LENS_H / 2;
const FRAME_Z_TOP = LENS_Z_TOP + RIM_TOP;
const FRAME_Z_BOT = LENS_Z_BOT - RIM_BOT;
const WING_Z_TOP = FRAME_Z_TOP + WING_RISE;

const LENS_INNER_TOP_X = HALF_BRIDGE;
const LENS_OUTER_TOP_X = HALF_BRIDGE + LENS_TOP_W;
const LENS_INNER_BOT_X = HALF_BRIDGE + (LENS_TOP_W - LENS_BOT_W) / 2;
const LENS_OUTER_BOT_X = LENS_INNER_BOT_X + LENS_BOT_W;
const FRAME_HALF_W = LENS_OUTER_TOP_X + RIM_OUTER;

const BOT_INSET = 10;
const BOT_CORNER_R = 9;
const TOP_CORNER_X = 5;
const WING_TIP_X = FRAME_HALF_W + TOP_CORNER_X;

const NOSE_NOTCH_W = 7.5;
const NOSE_NOTCH_DEPTH = 4.3;

const CAMERA_R = 4.25;
const CAMERA_INNER_R = 2.65;
const CAMERA_BEZEL_R = 4.75;
const LED_R = 1.0;

const ACETATE_MAT = {
  baseColor: '#2b2b2b',
  metalness: 0,
  roughness: 0.24,
  clearcoat: 0.85,
  clearcoatRoughness: 0.08,
  ior: 1.55,
};

const LENS_MAT = {
  baseColor: '#7a8983',
  metalness: 0,
  roughness: 0.12,
  clearcoat: 0.7,
  clearcoatRoughness: 0.04,
  ior: 1.5,
};

function xzSketchToFrontBody(sketch, depth = FRAME_DEPTH, yOffset = 0) {
  return sketch
    .extrude(depth)
    .rotate([1, 0, 0], 90)
    .translate(0, depth + yOffset, 0);
}

function cylY(depth, radius, yFront, zSegments = 64) {
  return cylinder(depth, radius, zSegments)
    .alongAxis([0, 1, 0])
    .translate(0, yFront, 0);
}

function lensSketch(sign: 1 | -1, inset = 0) {
  const innerTopX = sign * (LENS_INNER_TOP_X + inset);
  const outerTopX = sign * (LENS_OUTER_TOP_X - inset);
  const innerBotX = sign * (LENS_INNER_BOT_X + inset);
  const outerBotX = sign * (LENS_OUTER_BOT_X - inset);
  const topZ = LENS_Z_TOP - inset * 0.35;
  const botZ = LENS_Z_BOT + inset * 0.65;

  const outerTopR = 6.4;
  const innerTopR = 4.5;
  const innerBotR = 5.2;
  const outerBotR = 6.2;

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

const frameSilhouette = path()
  .moveTo(-WING_TIP_X, WING_Z_TOP)
  .sagittaArc(-FRAME_HALF_W, WING_Z_TOP - 4.2, 1.4)
  .lineTo(-FRAME_HALF_W + BOT_INSET / 2, FRAME_Z_BOT + BOT_CORNER_R)
  .sagittaArc(-FRAME_HALF_W + BOT_INSET, FRAME_Z_BOT, 1.8)
  .sagittaArc(0, FRAME_Z_BOT - 2.1, -0.9)
  .sagittaArc(FRAME_HALF_W - BOT_INSET, FRAME_Z_BOT, -0.9)
  .sagittaArc(FRAME_HALF_W - BOT_INSET / 2, FRAME_Z_BOT + BOT_CORNER_R, 1.8)
  .lineTo(FRAME_HALF_W, WING_Z_TOP - 4.2)
  .sagittaArc(WING_TIP_X, WING_Z_TOP, 1.4)
  .sagittaArc(0, FRAME_Z_TOP + 0.9, -1.2)
  .sagittaArc(-WING_TIP_X, WING_Z_TOP, -1.2)
  .close();

const frameBlank = xzSketchToFrontBody(frameSilhouette);

const leftLensCut = xzSketchToFrontBody(lensSketch(-1), FRAME_DEPTH + 6, -3);
const rightLensCut = xzSketchToFrontBody(lensSketch(1), FRAME_DEPTH + 6, -3);

const bridgeNoseNotch = path()
  .moveTo(-NOSE_NOTCH_W / 2, FRAME_Z_BOT - 0.6)
  .lineTo(NOSE_NOTCH_W / 2, FRAME_Z_BOT - 0.6)
  .lineTo(0, FRAME_Z_BOT + NOSE_NOTCH_DEPTH)
  .close();

const noseCut = xzSketchToFrontBody(bridgeNoseNotch, FRAME_DEPTH + 6, -3);

const CAM_X = -(LENS_OUTER_TOP_X) + CAMERA_R + 2.4;
const CAM_Z = LENS_Z_TOP + (FRAME_Z_TOP - LENS_Z_TOP) * 0.52;
const LED_X = CAM_X + CAMERA_R + 6.1;
const LED_Z = CAM_Z + 0.15;

const cameraCounterbore = cylY(3.2, CAMERA_BEZEL_R, -0.25, 72).translate(CAM_X, 0, CAM_Z);
const ledPocket = cylY(1.15, LED_R + 0.22, -0.18, 36).translate(LED_X, 0, LED_Z);

const upperBrowRelief = xzSketchToFrontBody(
  path()
    .moveTo(-WING_TIP_X + 7, FRAME_Z_TOP - 1.2)
    .sagittaArc(0, FRAME_Z_TOP - 2.0, -0.8)
    .sagittaArc(WING_TIP_X - 7, FRAME_Z_TOP - 1.2, -0.8)
    .lineTo(WING_TIP_X - 7, FRAME_Z_TOP - 3.0)
    .sagittaArc(0, FRAME_Z_TOP - 4.0, 0.5)
    .sagittaArc(-WING_TIP_X + 7, FRAME_Z_TOP - 3.0, 0.5)
    .close(),
  1.2,
  0.2,
);

const lowerLensGrooveL = xzSketchToFrontBody(lensSketch(-1, 2.2), 0.9, 0.15);
const lowerLensGrooveR = xzSketchToFrontBody(lensSketch(1, 2.2), 0.9, 0.15);

const acetateBody = frameBlank
  .subtract(leftLensCut)
  .subtract(rightLensCut)
  .subtract(noseCut)
  .subtract(cameraCounterbore)
  .subtract(ledPocket)
  .subtract(upperBrowRelief)
  .subtract(lowerLensGrooveL)
  .subtract(lowerLensGrooveR)
  .material(ACETATE_MAT)
  .color('#303234')
  .translate(0, BODY_Y_CENTERING, 0);

function lensInsert(sign: 1 | -1) {
  return xzSketchToFrontBody(lensSketch(sign, 1.4), 0.9, 1.15)
    .material(LENS_MAT)
    .color('#7a8983')
    .translate(0, BODY_Y_CENTERING, 0);
}

const cameraBezel = cylY(0.95, CAMERA_BEZEL_R - 0.35, -0.06, 72)
  .translate(CAM_X, BODY_Y_CENTERING, CAM_Z)
  .material({
    baseColor: '#090909',
    metalness: 0,
    roughness: 0.18,
    clearcoat: 0.55,
    clearcoatRoughness: 0.05,
  })
  .color('#080a0c');

const cameraGlass = cylY(0.75, CAMERA_INNER_R, -0.22, 64)
  .translate(CAM_X, BODY_Y_CENTERING - 0.05, CAM_Z)
  .material({
    baseColor: '#06080a',
    metalness: 0,
    roughness: 0.07,
    clearcoat: 0.9,
    clearcoatRoughness: 0.02,
    ior: 1.7,
  })
  .color('#05070a');

const cameraHighlight = cylY(0.12, 0.65, -0.32, 24)
  .translate(CAM_X - 0.75, BODY_Y_CENTERING - 0.08, CAM_Z + 0.8)
  .material({
    baseColor: '#5e6670',
    metalness: 0,
    roughness: 0.2,
    clearcoat: 0.2,
  })
  .color('#66717a');

const ledDiffuser = cylY(0.65, LED_R, -0.16, 36)
  .translate(LED_X, BODY_Y_CENTERING - 0.02, LED_Z)
  .material({
    baseColor: '#c54a34',
    metalness: 0,
    roughness: 0.18,
    clearcoat: 0.45,
    clearcoatRoughness: 0.06,
  })
  .color('#d15834');

const nosePadShadow = xzSketchToFrontBody(
  path()
    .moveTo(-4.2, FRAME_Z_BOT + 0.3)
    .lineTo(4.2, FRAME_Z_BOT + 0.3)
    .lineTo(0, FRAME_Z_BOT + 4.8)
    .close(),
  0.45,
  -0.15,
)
  .material({
    baseColor: '#0e0e0e',
    metalness: 0,
    roughness: 0.38,
    clearcoat: 0.2,
  })
  .color('#111111')
  .translate(0, BODY_Y_CENTERING, 0);

return [
  { name: 'glossy black acetate frame with bevels and relief grooves', shape: acetateBody },
  { name: 'left smoked translucent lens seated in rim opening', shape: lensInsert(-1) },
  { name: 'right smoked translucent lens seated in rim opening', shape: lensInsert(1) },
  { name: 'left upper outer recessed camera black bezel', shape: cameraBezel },
  { name: 'left upper outer camera glass inset', shape: cameraGlass },
  { name: 'camera glass highlight seated inside lens', shape: cameraHighlight },
  { name: 'small status LED between camera and bridge', shape: ledDiffuser },
  { name: 'darkened inverted V bridge nose notch', shape: nosePadShadow },
];
