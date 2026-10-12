// Manual hand coffee grinder — dual-bearing conical burr set.
//
// An original kernelCAD design study of a hand grinder whose whole point is
// burr concentricity: the drive shaft is constrained by TWO deep-groove
// bearings, one in the lid above the burrs and one in a three-spoke carrier
// below them, so the inner burr cannot wobble the way it does on grinders
// that hang the shaft from a single top bushing. The grounds fall between the
// lower carrier spokes into the catch cup.
//
// Stack (bottom -> top, Z-up, shaft on the Z axis):
//   catch cup -> grind-adjust nut -> bottom bearing in 3-spoke carrier ->
//   conical inner burr on the shaft inside the outer ring burr ->
//   preload spring + shaft collar -> hopper (body tube) -> lid with the top
//   bearing -> hex drive -> crank arm -> knob.
//
// Every dimension is a param or derived from one with ParamRef arithmetic, so
// body diameter / length / burr diameter / grind setting / crank length all
// re-solve live. Bearing size is a catalog choice (608, 688, 626, 6000).
// `explode` slides parts apart along the shaft axis for an exploded view; the
// section view is the CLI/Studio section plane (see Run).
//
// Units: mm and degrees.
//
// Run:
//   npx tsx src/agent/cli/index.ts evaluate examples/gallery/hand-coffee-grinder.kcad.ts
//   npx tsx src/agent/cli/index.ts render examples/gallery/hand-coffee-grinder.kcad.ts -o hero.png --no-watermark
//   npx tsx src/agent/cli/index.ts render examples/gallery/hand-coffee-grinder.kcad.ts --section y=0 -o section.png --no-watermark
//   npx tsx src/agent/cli/index.ts render examples/gallery/hand-coffee-grinder.kcad.ts --explode 1.2 -o exploded.png --no-watermark

// --- Editable parameters -----------------------------------------------------
const bodyDiameter = param('bodyDiameter', 52, {
  min: 46,
  max: 70,
  description: 'Outer diameter of the body tube, cup and lid (mm).',
});
const bodyLength = param('bodyLength', 140, {
  min: 110,
  max: 200,
  description: 'Length of the body tube from the cup joint to the lid seat (mm); sets hopper volume.',
});
const burrDiameter = param('burrDiameter', 38, {
  min: 32,
  max: 46,
  description: 'Inner burr cutting diameter at its widest (mm). Keep at least 8 mm under bodyDiameter.',
});
const bearingSize = param('bearingSize', '608', {
  choices: ['608', '688', '626', '6000'],
  description: 'Deep-groove bearing used top AND bottom (608 = 8x22x7 skate bearing).',
});
const grindSetting = param('grindSetting', 0.6, {
  min: 0,
  max: 2,
  description: 'Axial drop of the inner burr set by the adjust nut (mm); 0 = finest, larger = coarser.',
});
const crankLength = param('crankLength', 85, {
  min: 60,
  max: 120,
  description: 'Crank arm length, shaft axis to knob axis (mm).',
});
const crankDeg = param('crankDeg', 0, {
  min: -180,
  max: 180,
  description: 'Crank / shaft rotation (deg).',
});
const explode = param('explode', 0, {
  min: 0,
  max: 1,
  description: 'Exploded-view factor: 0 = assembled, 1 = parts pulled apart along the shaft.',
});

// --- Bearing catalog (id x od x width, mm) -----------------------------------
const BEARINGS: Record<string, { id: number; od: number; w: number }> = {
  '608': { id: 8, od: 22, w: 7 },
  '688': { id: 8, od: 16, w: 5 },
  '626': { id: 6, od: 19, w: 6 },
  '6000': { id: 10, od: 26, w: 8 },
};
const brg = BEARINGS[bearingSize.value as string] ?? BEARINGS['608']!;
const rShaft = brg.id / 2;
const rBrgOut = brg.od / 2;
const W = brg.w;

// --- Palette -----------------------------------------------------------------
const C_BODY = '#b8bfc7';   // bead-blasted aluminium
const C_DARK = '#2c3035';   // black anodised cup + lid
const C_STEEL = '#8d959e';  // hardened burr steel
const C_SHAFT = '#a7adb4';
const C_BEARING = '#d6dade';
const C_ACCENT = '#c46a34'; // bronze adjust nut
const C_SPRING = '#c9a94a';
const C_WOOD = '#7d5234';

// --- Derived stations --------------------------------------------------------
const R = bodyDiameter.divide(2);       // body outer radius
const Ri = R.subtract(2);               // body bore
const Rb = burrDiameter.divide(2);      // inner burr max radius
const zCupTop = 42;                     // cup / body joint
const zTop = bodyLength.add(zCupTop);   // body top = lid seat
const zBrgLo = 55;                      // bottom bearing seat
const zBurr = 78;                       // outer burr bottom face
const burrH = 22;                       // outer burr height
const drop = grindSetting.negate();     // axial shift of the rotating stack

function ex(k: number) {
  return explode.multiply(k);
}

// Revolve a closed (radius, z) polygon about the Z axis.
type Pt = [Editable<number>, Editable<number>];
function revolvePts(pts: Pt[]) {
  let p = path().moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) p = p.lineTo(pts[i]![0], pts[i]![1]);
  return p.close().revolve();
}

// Shielded deep-groove bearing as one ring with recessed shields.
function bearing(z0: Editable<number>) {
  const t = (brg.od - brg.id) / 7;
  const at = (dz: number) => (typeof z0 === 'number' ? z0 + dz : z0.add(dz));
  return revolvePts([
    [rShaft, at(0)],
    [rShaft + t, at(0)],
    [rShaft + t, at(0.5)],
    [rBrgOut - t, at(0.5)],
    [rBrgOut - t, at(0)],
    [rBrgOut, at(0)],
    [rBrgOut, at(W)],
    [rBrgOut - t, at(W)],
    [rBrgOut - t, at(W - 0.5)],
    [rShaft + t, at(W - 0.5)],
    [rShaft + t, at(W)],
    [rShaft, at(W)],
  ]).color(C_BEARING);
}

// --- Static parts ------------------------------------------------------------
// Catch cup with a spigot that slips into the body bore.
const cup = revolvePts([
  [0, 0],
  [R, 0],
  [R, zCupTop],
  [Ri, zCupTop],
  [Ri, zCupTop + 8],
  [Ri.subtract(1.6), zCupTop + 8],
  [Ri.subtract(1.6), 3],
  [0, 3],
]).color(C_DARK).translate(0, 0, ex(-120));

// Body tube with a grip band.
const bodyTube = revolvePts([
  [Ri, zCupTop],
  [R, zCupTop],
  [R, zCupTop + 30],
  [R.add(0.8), zCupTop + 32],
  [R.add(0.8), zCupTop + 58],
  [R, zCupTop + 60],
  [R, zTop],
  [Ri, zTop],
])
  .color(C_BODY)
  // Exploded view: the tube steps aside so the burr stack on the shaft shows.
  .translate(ex(-75), 0, 0);

// Lower bearing carrier: hub + 3 spokes + rim pressed into the bore. Grounds
// fall through the open sectors between the spokes.
const carrierZ0 = zBrgLo - 1;
const carrierH = W + 1;
const carrierHub = revolvePts([
  [rBrgOut - 1.5, carrierZ0],
  [rBrgOut + 3, carrierZ0],
  [rBrgOut + 3, carrierZ0 + carrierH],
  [rBrgOut, carrierZ0 + carrierH],
  [rBrgOut, carrierZ0 + 1],
  [rBrgOut - 1.5, carrierZ0 + 1],
]);
const carrierRim = revolvePts([
  [Ri.subtract(3), carrierZ0],
  [Ri, carrierZ0],
  [Ri, carrierZ0 + carrierH],
  [Ri.subtract(3), carrierZ0 + carrierH],
]);
const spoke = extrudePolygon(
  [
    [rBrgOut + 2, -2.5],
    [Ri.subtract(2), -2.5],
    [Ri.subtract(2), 2.5],
    [rBrgOut + 2, 2.5],
  ],
  carrierH,
).translate(0, 0, carrierZ0);
const lowerCarrier = carrierHub
  .union(carrierRim)
  .union(spoke.patternCircular({ count: 3, axis: [0, 0, 1] }))
  .color(C_DARK)
  .translate(0, 0, ex(-45));

const bottomBearing = bearing(zBrgLo).translate(0, 0, ex(-70));

// Outer ring burr: conical bore, wider at the top so beans feed in, cut with
// axial teeth.
const outerBurrBore = (z: 'lo' | 'hi') => (z === 'lo' ? Rb : Rb.multiply(0.82));
const outerBurrBlank = revolvePts([
  [outerBurrBore('lo'), zBurr],
  [Ri, zBurr],
  [Ri, zBurr + burrH],
  [outerBurrBore('hi'), zBurr + burrH],
]);
const outerTeeth = extrudePolygon(
  [
    [Rb.multiply(0.8), -0.7],
    [Rb.add(1.2), -0.7],
    [Rb.add(1.2), 0.7],
    [Rb.multiply(0.8), 0.7],
  ],
  burrH - 4,
)
  .translate(0, 0, zBurr + 2)
  .patternCircular({ count: 18, axis: [0, 0, 1] });
const outerBurr = outerBurrBlank.subtract(outerTeeth).color(C_STEEL).translate(0, 0, ex(45));

// Lid: bean-loading cap that carries the TOP bearing.
const lid = revolvePts([
  [rBrgOut, zTop.subtract(W + 1)],
  [rBrgOut + 3, zTop.subtract(W + 1)],
  [rBrgOut + 3, zTop],
  [Ri.subtract(1.6), zTop],
  [Ri.subtract(1.6), zTop.subtract(6)],
  [Ri, zTop.subtract(6)],
  [Ri, zTop],
  [R, zTop],
  [R, zTop.add(5)],
  [rBrgOut - 1.5, zTop.add(5)],
  [rBrgOut - 1.5, zTop],
  [rBrgOut, zTop],
]).color(C_DARK).translate(0, 0, ex(150));

const topBearing = bearing(zTop.subtract(W)).translate(0, 0, ex(125));

// --- Rotating stack (rides on the shaft) -------------------------------------
const zShaftBot = 45;
const zHexBot = zTop.add(8);
const hexLen = 20;
function hexPrism(z0: Editable<number>, len: number, circR: number) {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push([circR * Math.cos(a), circR * Math.sin(a)]);
  }
  return extrudePolygon(pts, len).translate(0, 0, z0);
}
const shaftRound = revolvePts([
  [0, zShaftBot],
  [rShaft, zShaftBot],
  [rShaft, zHexBot],
  [0, zHexBot],
]);
// Retaining collar the spring pushes against.
const zCollar = 124;
const collar = revolvePts([
  [rShaft, zCollar],
  [rShaft + 4, zCollar],
  [rShaft + 4, zCollar + 3],
  [rShaft, zCollar + 3],
]);
const shaft = shaftRound
  .union(hexPrism(zHexBot, hexLen, rShaft))
  .union(collar)
  .color(C_SHAFT)
  .translate(0, 0, drop);

// Conical inner burr: skirt below the outer burr, cone narrowing upward,
// hub on top; axial flutes.
const innerBurrBlank = revolvePts([
  [rShaft, zBurr - 6],
  [Rb.subtract(0.4), zBurr - 6],
  [Rb.subtract(0.4), zBurr],
  [Rb.multiply(0.55), zBurr + burrH],
  [rShaft + 4, zBurr + burrH + 6],
  [rShaft, zBurr + burrH + 6],
]);
const innerFlutes = extrudePolygon(
  [
    [Rb.multiply(0.5), -0.8],
    [Rb.add(1), -0.8],
    [Rb.add(1), 0.8],
    [Rb.multiply(0.5), 0.8],
  ],
  burrH - 2,
)
  .translate(0, 0, zBurr + 1)
  .patternCircular({ count: 12, axis: [0, 0, 1] });
const innerBurr = innerBurrBlank
  .subtract(innerFlutes)
  .color(C_STEEL)
  .translate(0, 0, drop.add(ex(10)));

// Preload spring between the inner burr hub and the collar.
const zSpringBot = zBurr + burrH + 6;
const springTurns = 5;
const wireR = 0.7;
const springPitch = (zCollar - zSpringBot - 2 * wireR) / springTurns;
const spring = path()
  .circle(0, 0, wireR)
  .sweep(helix({ radius: rShaft + 2.4, pitch: springPitch, turns: springTurns }), {
    spine: 'helix',
  })
  .translate(0, 0, zSpringBot + wireR)
  .color(C_SPRING)
  .translate(0, 0, drop.add(ex(80)));

// Grind-adjust nut under the bottom bearing (knurled).
const nut = revolvePts([
  [rShaft, 47],
  [rShaft + 5, 47],
  [rShaft + 5, 55],
  [rShaft, 55],
])
  .subtract(
    extrudePolygon([[rShaft + 4.4, -0.5], [rShaft + 6, -0.5], [rShaft + 6, 0.5], [rShaft + 4.4, 0.5]], 8)
      .translate(0, 0, 47)
      .patternCircular({ count: 16, axis: [0, 0, 1] }),
  )
  .color(C_ACCENT)
  .translate(0, 0, ex(-95));

// Crank arm with a hex socket hub on the drive.
const zArm = zHexBot.add(4);
const armT = 6;
const armHub = revolvePts([
  [0, zArm],
  [rShaft + 6, zArm],
  [rShaft + 6, zArm.add(12)],
  [0, zArm.add(12)],
]);
const armBar = extrudePolygon(
  [
    [0, -7],
    [crankLength, -5],
    [crankLength.add(6), 0],
    [crankLength, 5],
    [0, 7],
  ],
  armT,
).translate(0, 0, zArm.add(12 - armT));
const knobBoss = revolvePts([
  [0, 0],
  [6, 0],
  [6, armT],
  [0, armT],
]).translate(crankLength, 0, zArm.add(12 - armT));
const crankArm = armHub
  .union(armBar)
  .union(knobBoss)
  .subtract(hexPrism(zArm, 12, rShaft))
  .color(C_BODY)
  .translate(0, 0, drop.add(ex(185)));

const zKnob = zArm.add(12);
const knob = path()
  .moveTo(0, 0)
  .lineTo(3, 0)
  .lineTo(3, 3)
  .lineTo(8, 5)
  .lineTo(9.5, 12)
  .lineTo(9, 20)
  .lineTo(6, 24)
  .lineTo(0, 25)
  .close()
  .revolve()
  .color(C_WOOD)
  .translate(crankLength, 0, zKnob)
  .translate(0, 0, drop.add(ex(215)));

// --- Assembly ----------------------------------------------------------------
const grinder = assembly('dual-bearing hand coffee grinder');
function frameConnector(origin: [number, number, number]) {
  return { type: 'frame' as const, origin: { kind: 'vec3' as const, value: origin } };
}
let fastenSeq = 0;
type PartRef = ReturnType<typeof grinder.part>;
type PartShape = Parameters<typeof grinder.part>[1];
function fixed(parent: PartRef, name: string, shape: PartShape): PartRef {
  const child = grinder.part(name, shape);
  const slot = ++fastenSeq;
  parent.connector(`fastener-${slot}-parent`, frameConnector([0, 0, 0]));
  child.connector(`fastener-${slot}-child`, frameConnector([0, 0, 0]));
  grinder.mate(`fixed-${slot}`, `${parent.name}.fastener-${slot}-parent`, `${child.name}.fastener-${slot}-child`, 'fastened');
  return child;
}

const body = grinder.part('body-tube', bodyTube);
fixed(body, 'catch-cup', cup);
const carrierPart = fixed(body, 'lower-bearing-carrier', lowerCarrier);
const bottomBearingPart = fixed(carrierPart, 'bottom-bearing', bottomBearing);
fixed(body, 'outer-ring-burr', outerBurr);
const lidPart = fixed(body, 'lid', lid);
fixed(lidPart, 'top-bearing', topBearing);

const shaftPart = grinder.part('drive-shaft', shaft);
// The shaft turns in the bottom bearing (and the top one); the revolute is
// authored on the bearing it is seated in.
bottomBearingPart.connector('drive-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
shaftPart.connector('drive-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
grinder.mate('drive', 'bottom-bearing.drive-axis', 'drive-shaft.drive-axis', 'revolute', {
  limitsDeg: [-180, 180],
});
fixed(shaftPart, 'inner-conical-burr', innerBurr);
fixed(shaftPart, 'grind-adjust-nut', nut);
fixed(shaftPart, 'preload-spring', spring);
const armPart = fixed(shaftPart, 'crank-arm', crankArm);
fixed(armPart, 'crank-knob', knob);

setCameraTarget(0, 0, 110);

return grinder.solvedModel({ drive: crankDeg });
