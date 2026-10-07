---
id: freight-trailer-roof-solar-batteries
title: Box semi-trailer with roof solar-battery packs placed on a keep-out and axle-balance rule
tags: [assembly, connector, mate, parameter, material, extrude, sketch, fillet, plate, manufacturing, choice-param, typed-params, density]
keywords:
  - freight trailer roof solar batteries
  - box semi-trailer solar battery placement
  - optimal roof module layout keep-out
  - kingpin bogie load share centroid
  - corrugated dry van landing gear bogie
  - solar panel battery cabinet roof mount
  - trailer roof walkway fairing margin
when_to_use: >-
  Prompt asks for a freight box / dry-van semi-trailer with solar-battery
  modules, or solar-panel-plus-battery cabinets, mounted on the roof and an
  optimal or balanced location for them. Pack the maximum grid that fits
  inside the front-fairing, rear-door, and side-walkway keep-outs, then
  center that grid on the kingpin/bogie static-reaction station. The rule
  is closed-form packing plus a reaction split — not an FEA solve and not
  an OCCT mass-properties query. Doors are modeled closed and fastened;
  they are not a swinging mechanism.
---

European 13.6 m dry van, full scale (millimetres). The roof pack is a
uniform grid, so its geometric centroid is its mass centroid. The script
places that centroid on the station that splits static reactions
`kingpinLoadShare` on the kingpin and the rest on the tandem bogie center,
then clamps the grid inside the keep-outs. `layoutNote` records the numbers
for the current choice-param run. Gap sliders move the same grid
symbolically; integer row/column counts recompute only when the script
runs again (`set_param` on the choice params). Each cabinet is one
fastened part in matte photovoltaic navy (`paint-matte` `#0c2340`) so the
array reads against the white box; feet, pack case, frame, and bolts
still carry their own named finishes inside that solid. FEA is not run.

```typescript
// Freight box semi-trailer + roof solar-battery cabinets.
//
// Optimal placement (closed form, re-run with the choice params):
// 1. Keep-outs: front fairing, rear door-header strip, side walkways.
// 2. rowCount/columnCount default to the maximum grid that fits those
//    keep-outs at the default gaps. Fewer rows or columns are still centered.
// 3. Every cabinet is the same solid, so the grid centroid is the mass centroid.
//    targetX = share * kingpinX + (1 - share) * bogieCenterX
//    is the station that puts `share` of the pack weight on the kingpin.
// 4. Center the grid on targetX and clamp it inside the keep-out window.
// FEA is not solved. OCCT mass properties are not queried. Doors are closed
// and fastened — no revolute, so this is not a swinging-door mechanism.
// animationView scrubs gapAlong / gapAcross; it does not add or remove cabinets.

const LENGTH = 13600;
const WIDTH = 2550;
const HALF_W = 1275;
const KINGPIN_X = 1200;
const AXLE_SPACE = 1320;
const REAR_AXLE_X = 10900;
const FRONT_AXLE_X = REAR_AXLE_X - AXLE_SPACE;
const BOGIE_CENTER_X = (FRONT_AXLE_X + REAR_AXLE_X) / 2;
const FRONT_KEEPOUT = 800;
const REAR_KEEPOUT = 450;
const MODULE_L = 1500;
const MODULE_W = 700;
const GAP_ALONG_0 = 100;
const GAP_ACROSS_0 = 60;
const SIDE_MARGIN_0 = 120;
const SKIN = 14;
const RIB_DEPTH = 32;
const INNER_Y = HALF_W - SKIN - RIB_DEPTH;

const FLOOR_Z = 1180;
const FLOOR_T = 36;
const FLOOR_TOP = FLOOR_Z + FLOOR_T;
const WALL_H = 2460;
const ROOF_Z = FLOOR_TOP + WALL_H;
const ROOF_T = 28;
const ROOF_TOP = ROOF_Z + ROOF_T;
const AXLE_Z = 550;
const RAIL_Z = 820;
const RAIL_H = 300;

function maxFit(usable, size, gap) {
  if (usable < size) return 1;
  return Math.floor((usable + gap) / (size + gap));
}

const optRows = maxFit(LENGTH - FRONT_KEEPOUT - REAR_KEEPOUT, MODULE_L, GAP_ALONG_0);
const optCols = maxFit(WIDTH - 2 * SIDE_MARGIN_0, MODULE_W, GAP_ACROSS_0);

const rowCount = param('rowCount', String(optRows), {
  choices: ['4', '5', '6', '7'],
  description: 'Cabinets along the trailer. Default is the maximum that fits the keep-outs at the default gap.',
});
const columnCount = param('columnCount', String(optCols), {
  choices: ['1', '2', '3'],
  description: 'Lateral columns. Default is the maximum that fits between the walkway margins.',
});
const kingpinLoadShare = param('kingpinLoadShare', '0.35', {
  choices: ['0.30', '0.35', '0.40'],
  description: 'Fraction of pack weight assigned to the kingpin. The rest goes to the bogie center.',
});
const gapAlong = param('gapAlong', GAP_ALONG_0, {
  min: 60, max: 240, unit: 'mm',
  description: 'Gap between cabinets along the trailer. The grid stays centered on the balance station.',
});
const gapAcross = param('gapAcross', GAP_ACROSS_0, {
  min: 40, max: 90, unit: 'mm',
  description: 'Gap between lateral columns.',
});
const sideMargin = param('sideMargin', SIDE_MARGIN_0, {
  min: 80, max: 140, unit: 'mm',
  description: 'Side walkway width. Column count uses the default; the strip itself follows this slider.',
});

const rowN = Number(rowCount.value);
const colN = Number(columnCount.value);
const share = Number(kingpinLoadShare.value);
const targetX = Math.round(share * KINGPIN_X + (1 - share) * BOGIE_CENTER_X);
const packLen0 = MODULE_L * rowN + GAP_ALONG_0 * Math.max(rowN - 1, 0);
let startX0 = targetX - packLen0 / 2;
let clampNote = 'none';
const minStart = FRONT_KEEPOUT;
const maxStart = LENGTH - REAR_KEEPOUT - packLen0;
if (startX0 < minStart) { startX0 = minStart; clampNote = 'front-keepout'; }
if (startX0 > maxStart) { startX0 = maxStart; clampNote = 'rear-keepout'; }
const centroidX = Math.round(startX0 + packLen0 / 2);

const layoutNote = param('layoutNote',
  'rows=' + rowN + ' cols=' + colN + ' targetX=' + targetX + ' startX=' + Math.round(startX0) + ' centroidX=' + centroidX + ' clamp=' + clampNote + ' share=' + share,
  {
    maxLength: 140,
    description: 'Diagnostic of this run. Not a geometry driver. FEA and mass-property queries are not used.',
  },
);

animationView({
  name: 'roof pack spacing',
  tracks: [
    { param: 'gapAlong', keys: [
      { atMs: 0, value: 80 },
      { atMs: 1600, value: 220, ease: 'easeInOut' },
      { atMs: 2800, value: 80, ease: 'easeInOut' },
    ] },
    { param: 'gapAcross', keys: [
      { atMs: 0, value: 40 },
      { atMs: 1600, value: 90, ease: 'easeInOut' },
      { atMs: 2800, value: 40, ease: 'easeInOut' },
    ] },
  ],
  fps: 12,
});

const packLen = gapAlong.multiply(Math.max(rowN - 1, 0)).add(MODULE_L * rowN);
const packWid = gapAcross.multiply(Math.max(colN - 1, 0)).add(MODULE_W * colN);
const startX = gapAlong.multiply(0).add(centroidX).subtract(packLen.divide(2));
const startY = gapAcross.multiply(0).subtract(packWid.divide(2));

function fuse(parts) {
  let acc = parts[0];
  for (let i = 1; i < parts.length; i++) acc = acc.union(parts[i]);
  return acc;
}

function frameConnector(part, name) {
  part.connector(name, {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  });
}

function alongY(length, radius) {
  return cylinder(length, radius).rotateX(90);
}

function iBeam(length, x0, yCenter) {
  const flangeW = 130;
  const flangeT = 18;
  const webT = 16;
  const y0 = yCenter - flangeW / 2;
  const bottom = box(length, flangeW, flangeT).translate(x0, y0, RAIL_Z);
  const top = box(length, flangeW, flangeT).translate(x0, y0, RAIL_Z + RAIL_H - flangeT);
  const web = box(length, webT, RAIL_H - flangeT).translate(x0, yCenter - webT / 2, RAIL_Z + flangeT / 2);
  return fuse([bottom, top, web]);
}

function corrugatedWall() {
  const valley = 150;
  const ribW = 70;
  const pitch = valley + ribW;
  const nRibs = Math.floor((LENGTH - 30) / pitch);
  let profile = path().moveTo(0, 0).lineTo(0, SKIN);
  let x = 0;
  for (let i = 0; i < nRibs; i++) {
    profile = profile
      .lineTo(x + valley, SKIN)
      .lineTo(x + valley, SKIN + RIB_DEPTH)
      .lineTo(x + pitch, SKIN + RIB_DEPTH)
      .lineTo(x + pitch, SKIN);
    x += pitch;
  }
  profile = profile.lineTo(LENGTH, SKIN).lineTo(LENGTH, 0).lineTo(0, 0).close();
  return profile.extrude(WALL_H);
}

const white = (shape) => shape.finish('paint-gloss', { color: '#f3f5f7' });

const chassisParts = [
  iBeam(LENGTH - 200, 100, -500),
  iBeam(LENGTH - 200, 100, 500),
];
for (let x = 500; x <= LENGTH - 700; x += 1450) {
  chassisParts.push(box(70, 1160, 95.5).translate(x, -580, RAIL_Z + RAIL_H - 36));
}
chassisParts.push(box(700, 1400, 28).translate(850, -700, RAIL_Z - 8));
chassisParts.push(cylinder(90, 28).translate(KINGPIN_X, 0, RAIL_Z - 80));
chassisParts.push(box(160, 2300, 80).translate(LENGTH - 280, -1150, 400));
chassisParts.push(box(70, 140, 460).translate(LENGTH - 240, -570, 400));
chassisParts.push(box(70, 140, 460).translate(LENGTH - 240, 430, 400));
chassisParts.push(box(80, 180, 740).translate(3200, 500, 400));
chassisParts.push(box(6400, 70, 70).translate(2800, 620, 440));
chassisParts.push(box(80, 180, 740).translate(3200, -680, 400));
chassisParts.push(box(6400, 70, 70).translate(2800, -690, 440));

const landingParts = [];
function legPost(y) {
  const outer = box(110, 110, 791.5).translate(2460, y, 28);
  const inner = box(86, 86, 800).translate(2472, y + 12, 20);
  const foot = box(240, 200, 36).translate(2395, y - 45, 0);
  return fuse([outer.subtract(inner), foot]);
}
landingParts.push(legPost(-470));
landingParts.push(legPost(360));
landingParts.push(alongY(900, 22).translate(2515, 450, 420));
landingParts.push(box(160, 140, 180).translate(2440, 400, 520));
landingParts.push(cylinder(180, 14).rotateY(90).translate(2440, 470, 600));

const bogieParts = [
  box(2800, 140, 120).translate(8800, -570, 699.5),
  box(2800, 140, 120).translate(8800, 430, 699.5),
];
for (const axleX of [FRONT_AXLE_X, REAR_AXLE_X]) {
  bogieParts.push(alongY(1533, 42).translate(axleX, 766.5, AXLE_Z));
  bogieParts.push(box(90, 150, 280).translate(axleX - 45, -560, 500));
  bogieParts.push(box(90, 150, 280).translate(axleX - 45, 410, 500));
}

function dualWheels(axleX) {
  const major = 450;
  const minor = 100;
  const innerY = 802;
  const outerY = 1030;
  const pieces = [];
  for (const y of [innerY, outerY]) {
    pieces.push(torus(major, minor).rotateX(90).translate(axleX, y, AXLE_Z).finish('rubber'));
    pieces.push(alongY(70, 370).translate(axleX, y + 35, AXLE_Z).finish('anodized'));
  }
  pieces.push(alongY(200, 80).translate(axleX, 1010, AXLE_Z).finish('steel'));
  return fuse(pieces).finish('rubber');
}

function batteryModule() {
  const foot = (x, y) => box(72, 72, 34).translate(x, y, 0).finish('aluminium');
  const bolt = (x, y) => cylinder(10, 8).translate(x, y, 26).finish('steel');
  const pack = box(MODULE_L - 96, MODULE_W - 96, 128)
    .fillet(8)
    .finish('anodized-black')
    .translate(48, 48, 24);
  const pvFrame = box(MODULE_L, MODULE_W, 30).translate(0, 0, 146).finish('aluminium');
  // Photovoltaic laminate. Leaf finishes name the feet, pack, frame, and
  // bolts; the fused cabinet then takes one matte navy appearance. An
  // assembly part renders as a single material, and without this root
  // finish the cabinet inherits the aluminium feet and disappears into
  // the white roof in a studio shot.
  const pv = box(MODULE_L - 36, MODULE_W - 36, 12)
    .translate(18, 18, 166)
    .finish('paint-matte', { color: '#0c2340' });
  return fuse([
    foot(8, 8),
    foot(MODULE_L - 80, 8),
    foot(8, MODULE_W - 80),
    foot(MODULE_L - 80, MODULE_W - 80),
    bolt(44, 44),
    bolt(MODULE_L - 44, 44),
    bolt(44, MODULE_W - 44),
    bolt(MODULE_L - 44, MODULE_W - 44),
    pack,
    pvFrame,
    pv,
  ]).finish('paint-matte', { color: '#0c2340' });
}

const fairingW = WIDTH - 160;
const fairing = path()
  .moveTo(0, 220)
  .lineTo(0, 0)
  .lineTo(760, 220)
  .close()
  .extrude(fairingW)
  .rotateX(-90)
  .translate(0, -fairingW / 2, ROOF_TOP + 218)
  .finish('paint-matte', { color: '#1c2430' });

const bodyPieces = [
  white(box(LENGTH, WIDTH, FLOOR_T).translate(0, -HALF_W, FLOOR_Z)),
  white(corrugatedWall().translate(0, INNER_Y, FLOOR_TOP)),
  white(corrugatedWall().reflect('xz').translate(0, -INNER_Y, FLOOR_TOP)),
  white(box(LENGTH, WIDTH, ROOF_T).translate(0, -HALF_W, ROOF_Z)),
  white(box(42, INNER_Y * 2, WALL_H).translate(0, -INNER_Y, FLOOR_TOP)),
  white(box(50, 140, 2304).translate(LENGTH - 50, -INNER_Y, FLOOR_TOP)),
  white(box(50, 140, 2304).translate(LENGTH - 50, INNER_Y - 140, FLOOR_TOP)),
  white(box(82, INNER_Y * 2, 156).translate(LENGTH - 82, -INNER_Y, ROOF_Z - 156)),
  white(box(82, 2178, 88).translate(LENGTH - 82, -1089, FLOOR_TOP)),
  white(box(36, 1040, 2216).translate(LENGTH - 86, -1080, FLOOR_TOP + 88)),
  white(box(36, 1040, 2216).translate(LENGTH - 86, 40, FLOOR_TOP + 88)),
  fairing,
  box(LENGTH - 1700, sideMargin, 4).translate(860, -HALF_W, ROOF_TOP - 1).finish('paint-matte', { color: '#2c3328' }),
  box(LENGTH - 1700, sideMargin, 4).translate(860, sideMargin.negate().add(HALF_W), ROOF_TOP - 1).finish('paint-matte', { color: '#2c3328' }),
  box(REAR_KEEPOUT, WIDTH - 80, 4).translate(LENGTH - REAR_KEEPOUT, -HALF_W + 40, ROOF_TOP - 1).finish('paint-matte', { color: '#3a3428' }),
];

for (const y of [-900, -450, 0, 450, 900]) {
  bodyPieces.push(box(18, 40, 26).translate(-6, y - 20, ROOF_Z - 70).finish('plastic-glossy', { color: '#e0a322' }));
  bodyPieces.push(box(18, 40, 26).translate(LENGTH - 12, y - 20, ROOF_Z - 70).finish('plastic-glossy', { color: '#b42318' }));
}
bodyPieces.push(box(LENGTH - 120, 10, 64).translate(60, -HALF_W - 4, FLOOR_TOP + 280).finish('plastic-glossy', { color: '#c0392b' }));
bodyPieces.push(box(LENGTH - 120, 10, 64).translate(60, HALF_W - 6, FLOOR_TOP + 280).finish('plastic-glossy', { color: '#c0392b' }));

for (const side of [-1, 1]) {
  const y = side * 916;
  bodyPieces.push(box(22, 460, 520).translate(11500, y - 230, 260).finish('rubber'));
  bodyPieces.push(box(40, 80, 460).translate(11490, y - 40, 740).finish('paint-matte', { color: '#1a1a1a' }));
}
for (const spec of [
  [LENGTH - 68, -1084, 1600],
  [LENGTH - 68, -1084, 2300],
  [LENGTH - 68, -1084, 3000],
  [LENGTH - 68, 1084, 1600],
  [LENGTH - 68, 1084, 2300],
  [LENGTH - 68, 1084, 3000],
]) {
  bodyPieces.push(cylinder(150, 16).translate(spec[0], spec[1], spec[2]).finish('steel'));
}
bodyPieces.push(cylinder(1900, 11).translate(LENGTH - 70, -70, 1450).finish('steel'));
bodyPieces.push(cylinder(1900, 11).translate(LENGTH - 70, 70, 1450).finish('steel'));

const trailer = assembly('freight-trailer');
const chassis = trailer.part('chassis', fuse(chassisParts), { material: 'mild-steel' });
const landing = trailer.part('landing-legs', fuse(landingParts), { material: 'mild-steel' });
const bogie = trailer.part('bogie', fuse(bogieParts), { material: 'mild-steel' });
const body = trailer.part(
  'box-body',
  fuse(bodyPieces).finish('paint-gloss', { color: '#f3f5f7' }),
  { material: 'aluminum-6061' },
);

frameConnector(chassis, 'origin');
frameConnector(chassis, 'to-landing');
frameConnector(chassis, 'to-bogie');
frameConnector(chassis, 'to-body');
frameConnector(landing, 'mount');
frameConnector(bogie, 'mount');
frameConnector(body, 'mount');
trailer.mate('landing-mount', 'chassis.to-landing', 'landing-legs.mount', 'fastened');
trailer.mate('bogie-mount', 'chassis.to-bogie', 'bogie.mount', 'fastened');
trailer.mate('body-mount', 'chassis.to-body', 'box-body.mount', 'fastened');

for (let a = 0; a < 2; a++) {
  const axleX = a === 0 ? FRONT_AXLE_X : REAR_AXLE_X;
  const right = trailer.part('wheel-axle' + a + '-right', dualWheels(axleX), { density: 1200 });
  const left = trailer.part('wheel-axle' + a + '-left', dualWheels(axleX).reflect('xz'), { density: 1200 });
  frameConnector(bogie, 'to-wheel-' + a + '-right');
  frameConnector(bogie, 'to-wheel-' + a + '-left');
  frameConnector(right, 'mount');
  frameConnector(left, 'mount');
  trailer.mate('wheel-' + a + '-right', 'bogie.to-wheel-' + a + '-right', 'wheel-axle' + a + '-right.mount', 'fastened');
  trailer.mate('wheel-' + a + '-left', 'bogie.to-wheel-' + a + '-left', 'wheel-axle' + a + '-left.mount', 'fastened');
}

const pitchX = gapAlong.add(MODULE_L);
const pitchY = gapAcross.add(MODULE_W);
for (let r = 0; r < rowN; r++) {
  for (let c = 0; c < colN; c++) {
    const name = 'pack-r' + r + '-c' + c;
    const mod = trailer.part(
      name,
      batteryModule().translate(startX.add(pitchX.multiply(r)), startY.add(pitchY.multiply(c)), ROOF_TOP + 0.5),
      { material: 'aluminum-6061' },
    );
    frameConnector(body, 'to-' + name);
    frameConnector(mod, 'mount');
    trailer.mate(name + '-mount', 'box-body.to-' + name, name + '.mount', 'fastened');
  }
}

void layoutNote;
return trailer.solvedModel({});
```
