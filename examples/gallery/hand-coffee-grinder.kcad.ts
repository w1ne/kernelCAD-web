// Manual hand coffee grinder — dual-bearing conical burr set (v2).
//
// An original kernelCAD design study of a hand grinder built around burr
// concentricity: the drive shaft runs in TWO deep-groove ball bearings, one in
// the lid above the burrs and one in a three-spoke carrier below them, so the
// conical inner burr cannot wobble inside the ring burr the way it does when a
// shaft hangs from a single top bushing. Grounds fall between the carrier
// spokes into the catch cup.
//
// Stack (bottom -> top, Z-up, shaft on the Z axis):
//   catch cup -> threaded grind-adjust nut + detent click ring -> bottom
//   bearing in a 3-spoke carrier -> helical conical inner burr inside the
//   helical outer ring burr -> preload spring, washer, circlip -> hopper
//   (knurled body tube) -> lid with the top bearing + circlip -> hex drive ->
//   crank arm + retaining screw -> knob on a shoulder pin.
//
// Fits (mm, on radius unless noted) are named constants below: N7-style
// nominal press for bearing outer races and burr/carrier rims, g6-style slide
// fit for the shaft in the inner races (the shaft must slide axially when the
// grind is adjusted), H8 slip for the hex drive, 0.05 thread play.
//
// Every dimension is a param or derived from one with ParamRef arithmetic.
// bodyDiameter and burrDiameter ranges are chosen so EVERY in-range pair keeps
// >= 3 mm of outer-burr wall (bodyDiameter - burrDiameter >= 14 mm); set_param
// rejects out-of-range values, so the burr can never break through the body.
// `explode` slides parts apart along the shaft; the section view is the
// CLI/Studio section plane (see Run).
//
// Units: mm and degrees.
//
// Run:
//   npx tsx src/agent/cli/index.ts evaluate examples/gallery/hand-coffee-grinder.kcad.ts
//   npx tsx src/agent/cli/index.ts render examples/gallery/hand-coffee-grinder.kcad.ts --preset publish -o hero.png --no-watermark
//   npx tsx src/agent/cli/index.ts render examples/gallery/hand-coffee-grinder.kcad.ts --section y=0 --section-flip --pose 0,6 -o section.png --no-watermark

// --- Editable parameters -----------------------------------------------------
const bodyDiameter = param('bodyDiameter', 58, {
  min: 58,
  max: 72,
  description: 'Outer diameter of the body tube, cup and lid (mm). Range keeps >= 3 mm outer-burr wall for every burrDiameter.',
});
const bodyLength = param('bodyLength', 140, {
  min: 110,
  max: 200,
  description: 'Body tube length from the cup seam to the lid seat (mm); sets hopper volume.',
});
const burrDiameter = param('burrDiameter', 40, {
  min: 34,
  max: 44,
  description: 'Inner burr cutting diameter at its widest (mm). 44 max against the 58 min body keeps the burr wall >= 3 mm.',
});
const bearingSize = param('bearingSize', '608', {
  choices: ['608', '688', '626', '6000'],
  description: 'Deep-groove ball bearing used top AND bottom (608 = 8x22x7).',
});
const grindSetting = param('grindSetting', 0.6, {
  min: 0,
  max: 2,
  description: 'Axial drop of the shaft + inner burr set by the threaded adjust nut (mm); 0 = finest.',
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
const cutaway = param('cutaway', false, {
  description: 'Half-section: remove the front half (y < 0) of the housing, burr ring and bearings as real solid cuts, so the shaft, both bearings and the burr gap show.',
});
const explode = param('explode', 0, {
  min: 0,
  max: 1,
  description: 'Exploded-view factor: 0 = assembled, 1 = parts pulled apart along the shaft.',
});

// --- Catalog + fits -----------------------------------------------------------
const BEARINGS: Record<string, { id: number; od: number; w: number; pitch: number }> = {
  '608': { id: 8, od: 22, w: 7, pitch: 0.75 },
  '688': { id: 8, od: 16, w: 5, pitch: 0.75 },
  '626': { id: 6, od: 19, w: 6, pitch: 0.75 },
  '6000': { id: 10, od: 26, w: 8, pitch: 1.0 },
};
const brg = BEARINGS[bearingSize.value as string] ?? BEARINGS['608']!;
const rShaft = brg.id / 2;
const rBrgOut = brg.od / 2;
const W = brg.w;

const FIT_SHAFT_SLIDE = 0.006; // g6-style: journal radius under the inner race bore
const FIT_HEX_SLIP = 0.04;     // H8-style: crank socket over the hex drive
const FIT_BURR_BORE = 0.01;    // inner burr bore over the shaft
const THREAD_PLAY = 0.05;      // adjust-nut thread clearance
const WALL = 2.5;              // body tube wall (6061 tube, CNC turned)
const CH = 0.6;                // default edge chamfer

// --- Palette (finish tokens + tints) -----------------------------------------
const ALU = '#b7bcc2'; // bead-blasted clear-anodised 6061 (matte, not mirror)
const ANOD = '#25282c';
const WALNUT = '#5a3a22';

// --- Helpers -------------------------------------------------------------------
// Real solid half-section (opaque cut faces), unlike a render clipping plane.
function cut<T extends ReturnType<typeof box>>(shape: T): T {
  return (cutaway.value ? shape.subtract(box(400, 200, 700).translate(-200, -200, -100)) : shape) as T;
}
type E = Editable<number>;
const plus = (x: E, d: number): E => (typeof x === 'number' ? x + d : x.add(d));
/** Solid disc r x h from z0 (revolved, so it reads as a turned land, not a drilled hole). */
function disc(r: E, h: number, z0: E = 0) {
  return revolvePts([[0, z0], [r, z0], [r, plus(z0, h)], [0, plus(z0, h)]]);
}
function ex(k: number) {
  return explode.multiply(k);
}
type Pt = [E, E];
function revolvePts(pts: Pt[], angleDeg?: number) {
  let p = path().moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) p = p.lineTo(pts[i]![0], pts[i]![1]);
  return angleDeg === undefined ? p.close().revolve() : p.close().revolve({ angleDeg });
}
/** Rectangular ring section r0..r1 x z0..z1 with chamfer c on every corner. */
function ring(r0: E, r1: E, z0: E, z1: E, c = CH) {
  return revolvePts([
    [plus(r0, c), z0],
    [plus(r1, -c), z0],
    [r1, plus(z0, c)],
    [r1, plus(z1, -c)],
    [plus(r1, -c), z1],
    [plus(r0, c), z1],
    [r0, plus(z1, -c)],
    [r0, plus(z0, c)],
  ]);
}
function hexPrism(z0: E, len: number, circR: number) {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push([circR * Math.cos(a), circR * Math.sin(a)]);
  }
  return extrudePolygon(pts, len).translate(0, 0, z0);
}
/** Star outline for helical teeth: n teeth, tooth tips at rTip, roots at rRoot. */
function toothStar(n: number, rTip: E, rRoot: E, tipFrac: number) {
  const pts: Array<[E, E]> = [];
  const pitch = (2 * Math.PI) / n;
  const r = (x: E, a: number): [E, E] =>
    typeof x === 'number' ? [x * Math.cos(a), x * Math.sin(a)] : [x.multiply(Math.cos(a)), x.multiply(Math.sin(a))];
  for (let i = 0; i < n; i++) {
    const a0 = i * pitch;
    const h = (pitch * tipFrac) / 2;
    pts.push(r(rRoot, a0 - pitch / 2 + h * 0.4));
    pts.push(r(rTip, a0 - h));
    pts.push(r(rTip, a0 + h));
    pts.push(r(rRoot, a0 + pitch / 2 - h * 0.4));
  }
  return pts;
}

// Deep-groove ball bearing: grooved inner + outer races, balls, cage.
function ballBearing(z0: E) {
  const t = (brg.od - brg.id) / 4;
  const rp = (brg.id + brg.od) / 4;
  const rBall = t * 0.62;
  const zMid = plus(z0, W / 2);
  const groove = (rc: number) =>
    path()
      .circle(rc, 0, rBall * 0.97, 32)
      .revolve()
      .translate(0, 0, zMid);
  const inner = ring(rShaft, rp - rBall * 0.45, z0, plus(z0, W), 0.3).subtract(groove(rp));
  const outer = ring(rp + rBall * 0.45, rBrgOut, z0, plus(z0, W), 0.3).subtract(groove(rp));
  const nBalls = Math.max(6, Math.floor((2 * Math.PI * rp) / (rBall * 2 * 1.45)));
  const balls = sphere(rBall).translate(rp, 0, 0).translate(0, 0, zMid).patternCircular({ count: nBalls, axis: [0, 0, 1] });
  const cage = ring(rp - rBall * 0.3, rp + rBall * 0.3, plus(zMid, -rBall * 0.35), plus(zMid, rBall * 0.35), 0.05);
  return cut(inner.union(outer).union(balls.union(cage))).finish('steel');
}

// --- Derived stations ----------------------------------------------------------
const R = bodyDiameter.divide(2);
const Ri = R.subtract(WALL);
const Rb = burrDiameter.divide(2);
const zCupTop = 42;
const zTop = bodyLength.add(zCupTop);
const zBrgLo = 55;
const zBurr = 78;
const burrH = 22;
const drop = grindSetting.negate();

// --- Catch cup: spigot slips into the body bore; chamfers meet as a V seam ----
const cup = cut(revolvePts([
  [0, 0],
  [R.subtract(1.5), 0],
  [R, 1.5],
  [R, zCupTop - CH],
  [R.subtract(CH), zCupTop],
  [Ri.subtract(0.05), zCupTop],
  [Ri.subtract(0.05), zCupTop + 7.5],
  [Ri.subtract(0.55), zCupTop + 8],
  [Ri.subtract(2.2), zCupTop + 8],
  [Ri.subtract(2.2), 5],
  [Ri.subtract(4.2), 3],
  [0, 3],
])
  )
  .finish('anodized-black')
  .translate(0, 0, ex(-140));

// --- Body tube with a diamond-knurled grip band --------------------------------
const knurlZ0 = zCupTop + 26;
const knurlH = 36;
// Straight knurl (axial ridges) crossed by circumferential V-grooves: reads as
// a fine diamond grip and lowers in seconds (a twisted double-helix knurl
// costs > 1 min of booleans at this tooth count).
const knurlTeeth = 60;
const knurlGrooves = 8;
const knurlRidges = extrudePolygon(toothStar(knurlTeeth, R.add(0.6), R.subtract(0.2), 0.35), knurlH)
  .subtract(disc(Ri.add(0.5), knurlH))
  .translate(0, 0, knurlZ0);
let knurl = knurlRidges;
const knurlGroovePts: Pt[] = [];
for (let i = 1; i < knurlGrooves; i++) {
  const zg = knurlZ0 + (knurlH * i) / knurlGrooves;
  knurlGroovePts.push([R.subtract(0.1), zg]);
}
let grooves = revolvePts([[R.subtract(0.1), knurlGroovePts[0]![1]], [R.add(1), plus(knurlGroovePts[0]![1], -1.1)], [R.add(1), plus(knurlGroovePts[0]![1], 1.1)]]);
for (let i = 1; i < knurlGroovePts.length; i++) {
  const zg = knurlGroovePts[i]![1];
  grooves = grooves.union(revolvePts([[R.subtract(0.1), zg], [R.add(1), plus(zg, -1.1)], [R.add(1), plus(zg, 1.1)]]));
}
knurl = knurl.subtract(grooves);
const bodyTube = cut(revolvePts([
  [Ri, zCupTop],
  [R.subtract(CH), zCupTop],
  [R, zCupTop + CH],
  [R, knurlZ0 - 1.2],
  [R.subtract(0.8), knurlZ0 - 0.4],
  [R.subtract(0.8), knurlZ0],
  [R.subtract(0.8), knurlZ0 + knurlH],
  [R.subtract(0.8), knurlZ0 + knurlH + 0.4],
  [R, knurlZ0 + knurlH + 1.2],
  [R, zTop.subtract(CH)],
  [R.subtract(CH), zTop],
  [Ri.add(0.5), zTop],
  [Ri, zTop.subtract(0.5)],
])
  .union(knurl)
  )
  .finish('anodized', { color: ALU })
  .translate(ex(-85), 0, 0);

// --- Lower bearing carrier: hub + 3 spokes + rim; grounds fall between spokes ---
const carrierZ0 = zBrgLo - 1;
const carrierZ1 = zBrgLo + W;
const carrierHub = revolvePts([
  [rBrgOut - 1.2, carrierZ0],
  [rBrgOut + 2.6, carrierZ0],
  [rBrgOut + 3.2, carrierZ0 + 0.6],
  [rBrgOut + 3.2, carrierZ1 - 0.6],
  [rBrgOut + 2.6, carrierZ1],
  [rBrgOut + 0.4, carrierZ1],
  [rBrgOut, carrierZ1 - 0.4],
  [rBrgOut, carrierZ0 + 1],
  [rBrgOut - 1.2, carrierZ0 + 1],
]);
const carrierRim = ring(Ri.subtract(3), Ri, carrierZ0, carrierZ1, 0.4);
const spoke = extrudePolygon(
  [
    [rBrgOut + 2.5, -2.5],
    [Ri.subtract(2.5), -2.5],
    [Ri.subtract(2.5), 2.5],
    [rBrgOut + 2.5, 2.5],
  ],
  W - 1,
).translate(0, 0, carrierZ0 + 1);
const lowerCarrier = cut(carrierHub
  .union(carrierRim)
  .union(spoke.patternCircular({ count: 3, axis: [0, 0, 1] }))
  )
  .finish('anodized', { color: '#3a3f46' })
  .translate(0, 0, ex(-55));

// Detent click ring under the carrier hub: 12 V notches the nut ridges click into.
const clickRing = cut(ring(rShaft + 0.6, rShaft + 5.5, carrierZ0 - 1, carrierZ0, 0.2)
  .subtract(
    box(1.4, 4.4, 0.9, true)
      .rotate([1, 0, 0], 0)
      .translate(rShaft + 3.2, 0, carrierZ0 - 1)
      .patternCircular({ count: 12, axis: [0, 0, 1] }),
  )
  )
  .finish('stainless')
  .translate(0, 0, ex(-75));

const bottomBearing = ballBearing(zBrgLo).translate(0, 0, ex(-95));

// --- Outer ring burr: conical bore, helical internal teeth -----------------------
const outerBurrBlank = revolvePts([
  [Rb, zBurr],
  [Ri.subtract(0.6), zBurr],
  [Ri, zBurr + 0.6],
  [Ri, zBurr + burrH - 0.6],
  [Ri.subtract(0.6), zBurr + burrH],
  [Rb.multiply(0.82).add(0.8), zBurr + burrH],
  [Rb.multiply(0.82), zBurr + burrH - 0.8],
]);
const outerCutter = extrudePolygon(toothStar(24, Rb.add(1.3), Rb.multiply(0.6), 0.32), burrH + 2, { twistAngle: -24 }).translate(0, 0, zBurr - 1);
const outerBurr = cut(outerBurrBlank.subtract(outerCutter))
  .finish('steel', { color: '#9aa3ab' }).translate(0, 0, ex(40));

// --- Lid: bean-loading cap that carries the TOP bearing --------------------------
const lid = cut(revolvePts([
  [rBrgOut, zTop.subtract(W + 1)],
  [rBrgOut + 2.6, zTop.subtract(W + 1)],
  [rBrgOut + 3.2, zTop.subtract(W + 0.4)],
  [rBrgOut + 3.2, zTop.subtract(2)],
  [rBrgOut + 5, zTop],
  [Ri.subtract(1.8), zTop],
  [Ri.subtract(1.8), zTop.subtract(5.5)],
  [Ri.subtract(1.3), zTop.subtract(6)],
  [Ri.subtract(0.05), zTop.subtract(6)],
  [Ri.subtract(0.05), zTop],
  [R.subtract(CH), zTop],
  [R, zTop.add(CH)],
  [R, zTop.add(4.2)],
  [R.subtract(1.2), zTop.add(5.4)],
  [rBrgOut + 1.5, zTop.add(6)],
  [rBrgOut - 1.2, zTop.add(6)],
  [rBrgOut - 1.2, zTop],
  [rBrgOut, zTop],
])
  )
  .finish('anodized-black')
  .translate(0, 0, ex(150));
const topBearing = ballBearing(zTop.subtract(W)).translate(0, 0, ex(125));

// --- Shaft: threaded adjust section, journals, circlip grooves, hex drive -------
const P = brg.pitch;
const H = (Math.sqrt(3) / 2) * P;
const rMinor = rShaft - (5 / 8) * H;
const halfWidth = (r: number) => (3 / 8) * P - (r - rMinor) * Math.tan(Math.PI / 6);
const crest = rShaft - rMinor;
const vProfile = path()
  .moveTo(-0.15 * P, -halfWidth(rMinor - 0.05 * P))
  .lineTo(-0.05 * P, -halfWidth(rMinor - 0.05 * P))
  .lineTo(crest, -halfWidth(rMinor + crest))
  .lineTo(crest, halfWidth(rMinor + crest))
  .lineTo(-0.05 * P, halfWidth(rMinor - 0.05 * P))
  .lineTo(-0.15 * P, halfWidth(rMinor - 0.05 * P))
  .close();
const nutZ0 = 44.5;
const nutH = 8;
const threadTurns = 16;
const threadZ0 = nutZ0 + nutH - 15 * P; // nut top lands on a whole pitch -> in phase
const shaftThread = vProfile.sweep(helix({ radius: rMinor, pitch: P, turns: threadTurns }), { spine: 'helix' }).translate(0, 0, threadZ0);
const zShaftBot = threadZ0 - 0.6;
const zThreadTop = threadZ0 + threadTurns * P + 0.3;
const zHexBot = zTop.add(9);
const hexLen = 14;
const rJ = rShaft - FIT_SHAFT_SLIDE;
const zCollar = 124;
const shaftCore = revolvePts([
  [0, zShaftBot],
  [rMinor - 0.3, zShaftBot],
  [rMinor, zShaftBot + 0.3],
  [rMinor, zThreadTop],
  [rJ, zThreadTop + 0.5],
  [rJ, zHexBot],
  [0, zHexBot],
]);
const circlipGroove = (z: E) => ring(rShaft - 0.45, rShaft + 1, z, plus(z, 0.9), 0.01);
const hexCircR = rShaft * 0.98;
const shaft = shaftCore
  .union(shaftThread)
  .subtract(circlipGroove(zCollar + 1))
  .subtract(circlipGroove(zTop.add(0.3)))
  .union(hexPrism(zHexBot, hexLen, hexCircR))
  .subtract(disc(1.7, 10, zHexBot.add(hexLen - 10)))
  .finish('stainless')
  .translate(0, 0, drop);

// Circlips (DIN 6799-style E/C ring, 330 deg open) and the spring washer.
function circlip(z: E) {
  return revolvePts(
    [
      [rShaft - 0.45, z],
      [rShaft + 2.4, z],
      [rShaft + 2.4, plus(z, 0.8)],
      [rShaft - 0.45, plus(z, 0.8)],
    ],
    330,
  ).finish('anodized-black');
}
const lowerCirclip = circlip(zCollar + 1.05).translate(0, 0, drop.add(ex(105)));
const topCirclip = circlip(zTop.add(0.35)).translate(0, 0, drop.add(ex(165)));
const springWasher = ring(rShaft + 0.1, rShaft + 4.5, zCollar, zCollar + 1.05, 0.2).finish('stainless').translate(0, 0, drop.add(ex(95)));

// --- Conical inner burr: fine-grind skirt + helical feed teeth ------------------
const innerBlank = revolvePts([
  [rShaft + FIT_BURR_BORE, zBurr - 6],
  [Rb.subtract(1), zBurr - 6],
  [Rb.subtract(0.4), zBurr - 5.4],
  [Rb.subtract(0.4), zBurr],
  [Rb.multiply(0.55), zBurr + burrH],
  [rShaft + 4.5, zBurr + burrH + 5],
  [rShaft + 4, zBurr + burrH + 6],
  [rShaft + FIT_BURR_BORE, zBurr + burrH + 6],
]);
const innerTeeth = extrudePolygon(toothStar(12, Rb.add(1), Rb.multiply(0.42), 0.42), burrH + 1, { twistAngle: 38 }).translate(0, 0, zBurr - 0.5);
const innerCore = disc(Rb.multiply(0.42).add(0.05), burrH + 12, zBurr - 6);
const skirtSerrations = extrudePolygon(toothStar(36, Rb.add(0.5), Rb.subtract(1.1), 0.5), 5).translate(0, 0, zBurr - 5.2);
const innerBurr = innerBlank
  .intersect(innerTeeth.union(innerCore).union(disc(Rb.add(1), 6.5, zBurr - 6)).union(disc(Rb, 6.5, zBurr + burrH - 0.5)))
  .subtract(skirtSerrations.subtract(disc(Rb.subtract(1.1), 5, zBurr - 5.2)))
  .finish('steel', { color: '#8c949c' })
  .translate(0, 0, drop.add(ex(15)));

// Preload spring between the inner burr hub and the washer.
const zSpringBot = zBurr + burrH + 6;
const wireR = 0.7;
const springTurns = 5;
const springPitch = (zCollar - zSpringBot - 2 * wireR) / springTurns;
const spring = path()
  .circle(0, 0, wireR)
  .sweep(helix({ radius: rShaft + 2.4, pitch: springPitch, turns: springTurns }), { spine: 'helix' })
  .translate(0, 0, zSpringBot + wireR)
  .finish('stainless')
  .translate(0, 0, drop.add(ex(80)));

// --- Threaded grind-adjust nut with knurled flank + detent ridges ---------------
const nutBody = ring(rShaft - 0.5, rShaft + 5.5, nutZ0, nutZ0 + nutH, 0.6)
  .subtract(disc(rShaft + 0.2, nutH, nutZ0))
  .union(ring(rShaft + 0.2, rShaft + 5.5, nutZ0, nutZ0 + nutH, 0.6))
  .subtract(
    extrudePolygon(toothStar(28, rShaft + 6.5, rShaft + 5.1, 0.45), nutH - 2.4)
      .subtract(disc(rShaft + 5.1, nutH))
      .translate(0, 0, nutZ0 + 1.2),
  );
const nutThreaded = disc(rShaft + 1.5, nutH)
  .translate(0, 0, nutZ0)
  .hole({ atZ: nutZ0 + nutH, byNormal: 'Z' }, { u: 0, v: 0, diameter: brg.id, depth: 'through', thread: { pitch: P, modeled: true, clearance: THREAD_PLAY } });
const nutRidges = box(0.9, 4, 0.5, true)
  .translate(rShaft + 3.2, 0, nutZ0 + nutH + 0.25)
  .patternCircular({ count: 12, axis: [0, 0, 1] });
const nut = nutBody
  .union(nutThreaded)
  .union(nutRidges)
  .finish('brass')
  .translate(0, 0, drop.add(ex(-120)));

// --- Crank arm: tapered, filleted, hex socket hub, retaining screw ---------------
const armT = 7;
const zArm = zHexBot.add(1);
const hubR = rShaft + 7;
const endR = 7;
// Tapered outline (hub arc -> tangent-ish flanks -> end arc). Edges are
// softened by stacking a full-width core between two 1 mm layers inset 1 mm
// (a cheap, robust 45-degree edge break; a BREP fillet on this many short arc
// edges is not worth > 2 min of kernel time).
function armOutline(inset: number): Array<[E, E]> {
  const out: Array<[E, E]> = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / 12;
    out.push([(hubR - inset) * Math.cos(a), (hubR - inset) * Math.sin(a)]);
  }
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 12;
    out.push([crankLength.add((endR - inset) * Math.cos(a)), (endR - inset) * Math.sin(a)]);
  }
  return out;
}
const zBar = zArm.add(hexLen - 1 - armT);
const armBar = extrudePolygon(armOutline(0), armT - 2)
  .translate(0, 0, zBar.add(1))
  .union(extrudePolygon(armOutline(1), 1).translate(0, 0, zBar))
  .union(extrudePolygon(armOutline(1), 1).translate(0, 0, zBar.add(armT - 1)));
const armHub = ring(0, hubR, zArm, zArm.add(hexLen - 1), 1);
const crankArm = armHub
  .union(armBar)
  .subtract(hexPrism(zArm, hexLen, hexCircR + FIT_HEX_SLIP))
  .subtract(disc(2.6, armT).translate(crankLength, 0, zArm.add(hexLen - 1 - armT)))
  .finish('anodized', { color: '#cfd3d7' })
  .translate(0, 0, drop.add(ex(185)));
const zArmTop = zArm.add(hexLen - 1);
const screw = revolvePts([
  [0, zArmTop.subtract(9)],
  [1.6, zArmTop.subtract(9)],
  [1.6, zArmTop],
  [4.6, zArmTop],
  [4.6, zArmTop.add(1.2)],
  [3.4, zArmTop.add(2.8)],
  [0, zArmTop.add(2.8)],
])
  .finish('stainless')
  .translate(0, 0, drop.add(ex(215)));

// Shoulder pin pressed into the arm end; walnut knob turns on it.
const pin = revolvePts([
  [0, 0],
  [2.6, 0],
  [2.6, armT],
  [3.5, armT],
  [3.5, armT + 1],
  [2.4, armT + 1],
  [2.4, armT + 27],
  [3.4, armT + 27],
  [3.4, armT + 28.5],
  [0, armT + 28.5],
])
  .finish('stainless')
  .translate(crankLength, 0, zArm.add(hexLen - 1 - armT))
  .translate(0, 0, drop.add(ex(215)));
const knobProfile: Pt[] = [[2.5, 0]];
for (let i = 0; i <= 10; i++) {
  const s = i / 10;
  const z = 0.5 + s * 25;
  const r = 7 + 4.2 * Math.sin(Math.PI * (0.15 + 0.75 * s));
  knobProfile.push([r, z]);
}
knobProfile.push([2.5, 26]);
const knob = revolvePts(knobProfile)
  .finish('paint-matte', { color: WALNUT })
  .translate(crankLength, 0, zArmTop.add(1))
  .translate(0, 0, drop.add(ex(245)));

// --- Assembly ---------------------------------------------------------------------
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
fixed(carrierPart, 'detent-click-ring', clickRing);
const bottomBearingPart = fixed(carrierPart, 'bottom-bearing', bottomBearing);
fixed(body, 'outer-ring-burr', outerBurr);
const lidPart = fixed(body, 'lid', lid);
fixed(lidPart, 'top-bearing', topBearing);

// The shaft turns in the bottom bearing (and the top one).
const shaftPart = grinder.part('drive-shaft', shaft);
bottomBearingPart.connector('drive-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
shaftPart.connector('drive-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
grinder.mate('drive', 'bottom-bearing.drive-axis', 'drive-shaft.drive-axis', 'revolute', { limitsDeg: [-180, 180] });
const innerBurrPart = fixed(shaftPart, 'inner-conical-burr', innerBurr);
fixed(shaftPart, 'grind-adjust-nut', nut);
fixed(innerBurrPart, 'preload-spring', spring); // seats on the burr hub
fixed(shaftPart, 'spring-washer', springWasher);
fixed(shaftPart, 'circlip-lower', lowerCirclip);
fixed(shaftPart, 'circlip-top', topCirclip);
const armPart = fixed(shaftPart, 'crank-arm', crankArm);
fixed(armPart, 'crank-screw', screw);
const pinPart = fixed(armPart, 'knob-pin', pin);
fixed(pinPart, 'walnut-knob', knob);

setCameraTarget(0, 0, 115);

return grinder.solvedModel({ drive: crankDeg });
