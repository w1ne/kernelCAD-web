// Ray-Ban Meta / Wayfarer-style full smart glasses gallery model.
//
// This is a full-product model, not the older "front face only" demo. It keeps
// the Wayfarer front silhouette from the visual experiments and adds the parts
// that make the object read as Meta smart glasses: seated lenses, asymmetric
// camera/privacy LED, hinge hardware, thick electronics temples, touch strip,
// and ear bends.
//
// Coordinate convention: X = left/right, Z = up, smallest Y is the
// camera-facing front surface. Temples extend backward in +Y.

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

const CAMERA_BEZEL_R = 4.65;
const CAMERA_INNER_R = 2.45;
const CAMERA_X = -LENS_OUTER_TOP_X + 7.4;
const CAMERA_Z = LENS_TOP_Z + 4.4;

// On the real product the privacy LED is on the opposite upper corner from
// the camera. Keeping this separated makes the front read correctly.
const PRIVACY_LED_R = 1.05;
const PRIVACY_LED_X = LENS_OUTER_TOP_X - 7.4;
const PRIVACY_LED_Z = CAMERA_Z - 0.1;

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
  opacity: 0.72,
};

const RUBBER_DARK = {
  baseColor: '#151718',
  metalness: 0,
  roughness: 0.46,
  clearcoat: 0.25,
  clearcoatRoughness: 0.16,
  ior: 1.48,
};

const METAL_PIN = {
  baseColor: '#c8c3b8',
  metalness: 0.75,
  roughness: 0.28,
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

// Chunky black acetate body with Wayfarer wing corners.
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

const leftLensCut = frontBody(lensOpening(-1), FRAME_DEPTH + 6, -3);
const rightLensCut = frontBody(lensOpening(1), FRAME_DEPTH + 6, -3);
const leftLensSeat = frontBody(lensOpening(-1, 1.55), 1.0, 0.05);
const rightLensSeat = frontBody(lensOpening(1, 1.55), 1.0, 0.05);

const noseNotch = path()
  .moveTo(-NOSE_NOTCH_W / 2, FRAME_BOT_Z - 0.8)
  .lineTo(NOSE_NOTCH_W / 2, FRAME_BOT_Z - 0.8)
  .lineTo(0, FRAME_BOT_Z + NOSE_NOTCH_DEPTH)
  .close();
const noseCut = frontBody(noseNotch, FRAME_DEPTH + 6, -3);

const cameraCounterbore = yCylinder(3.0, CAMERA_BEZEL_R, 72).translate(CAMERA_X, -0.35, CAMERA_Z);
const cameraInnerPocket = yCylinder(3.35, CAMERA_INNER_R, 56).translate(CAMERA_X, -0.55, CAMERA_Z);
const privacyLedPocket = yCylinder(1.12, PRIVACY_LED_R + 0.18, 32).translate(
  PRIVACY_LED_X,
  -0.25,
  PRIVACY_LED_Z,
);

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
  .subtract(privacyLedPocket)
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

const privacyLedDiffuser = yCylinder(0.64, PRIVACY_LED_R, 32)
  .translate(PRIVACY_LED_X, CENTER_Y - 0.08, PRIVACY_LED_Z)
  .material({
    baseColor: '#d15a34',
    metalness: 0,
    roughness: 0.18,
    clearcoat: 0.45,
    clearcoatRoughness: 0.06,
  })
  .color('#d15a34');

function darkBox(w, d, h, x, y, z) {
  return box(w, d, h, true)
    .translate(x, y, z)
    .material(RUBBER_DARK)
    .color('#151718');
}

function darkBoxRotX(w, d, h, x, y, z, deg) {
  return box(w, d, h, true)
    .rotate([1, 0, 0], deg)
    .translate(x, y, z)
    .material(RUBBER_DARK)
    .color('#151718');
}

function sideTemple(sign: 1 | -1) {
  const x = sign * 81.0;
  const parts = [];

  // Build each temple as one connected solid so the gallery video reads as a
  // physical pair of glasses instead of many small pieces appearing in space.
  const body = darkBox(8.8, 13.2, 17.4, sign * 77.0, 7.2, 7.0)
    .union(darkBox(9.2, 48, 9.4, x, 31, 7.2))
    .union(darkBoxRotX(7.4, 54, 7.7, sign * 80.0, 76, 5.3, -4))
    .union(darkBoxRotX(5.8, 40, 6.2, sign * 78.5, 118, -1.8, -14))
    .union(
      cylinder(5.9, 2.85, 32)
        .alongAxis([1, 0, 0])
        .translate(sign * 78.5, 136, -6.4),
    )
    .material(RUBBER_DARK)
    .color('#151718');

  parts.push({
    name: sign < 0 ? 'left-connected-electronics-temple-with-ear-bend' : 'right-connected-electronics-temple-with-ear-bend',
    shape: body,
  });

  parts.push({
    name: sign < 0 ? 'left-hinge-barrel-pair' : 'right-hinge-barrel-pair',
    shape: cylinder(8.2, 2.0, 32)
      .alongAxis([0, 0, 1])
      .translate(sign * 76.8, 3.35, 7.5)
      .material(METAL_PIN)
      .color('#c8c3b8'),
  });

  // Touchpad strip on the right temple, flush and glossy.
  if (sign > 0) {
    parts.push({
      name: 'right-temple-glossy-touch-control-strip',
      shape: box(0.8, 32, 4.0, true)
        .translate(sign * 85.85, 41, 8.2)
        .material({
          baseColor: '#303336',
          metalness: 0,
          roughness: 0.16,
          clearcoat: 0.7,
          clearcoatRoughness: 0.04,
        })
        .color('#303336'),
    });
  }

  return parts;
}

const fullMetaGlassesParts = [
  { name: 'full-Wayfarer-front-frame-with-black-acetate-brow', shape: frame },
  { name: 'left-smoked-seated-lens-insert', shape: lensInsert(-1) },
  { name: 'right-smoked-seated-lens-insert', shape: lensInsert(1) },
  { name: 'left-recessed-Meta-camera-bezel', shape: cameraBezel },
  { name: 'left-recessed-Meta-camera-glass', shape: cameraGlass },
  { name: 'right-privacy-LED-diffuser', shape: privacyLedDiffuser },
  ...sideTemple(-1),
  ...sideTemple(1),
];

const fullMetaGlasses = assembly('full Ray-Ban Meta Wayfarer-style smart glasses');
for (const part of fullMetaGlassesParts) {
  fullMetaGlasses.part(part.name, part.shape);
}

return fullMetaGlasses.model();
