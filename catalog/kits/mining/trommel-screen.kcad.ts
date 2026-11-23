// SPDX-License-Identifier: CC0-1.0
// Rotary trommel screen, the slowly turning inclined drum that sizes ore or
// washes gravel. What makes it one: a long cylindrical screen of perforated
// panels held in a cage of stiffening rings and strakes, a blank feed section
// with a chute running ore into the high end, two steel riding tyres turning on
// pairs of trunnion rollers with the drive motor on one roller, a spray bar
// along the top, an undersize hopper under the screen feeding a cross
// conveyor and fines pile, and oversize rock dropping from the open low end.
// Millimetres, Z up, drum along X falling towards +X, cross conveyor towards
// -Y (front), ground origin under the drum centre.
meta({
  name: "trommel-screen",
  license: 'CC0-1.0',
  title: "Rotary trommel screen",
  description: "Rotary trommel screen at about real size: 7 m inclined drum with perforated screen panels in a cage of stiffening rings and longitudinal strakes, blank feed section and feed chute from a hopper of ore, two riding tyres on trunnion rollers with a geared motor driving one roller, spray-water bar with drop nozzles, undersize hopper over a cross conveyor building a fines pile, and an oversize chute dropping rock onto a pile, standing on a steel frame or on a tandem-axle trailer chassis. Material controls: drum and hopper coating, frame steel, screen panels, ore, plus a mounting choice (fixed, mobile). weathered, highVisibility and gravelWash presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'trommel', 'rotary screen', 'screening', 'gravel', 'washing plant'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#2e7d4f', { label: 'Drum and hopper coating' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Frame steel' });
const stainlessSteel = param('stainlessSteel', '#7c8589', { label: 'Screen panels' });
const ore = param('ore', '#9c8d7a', { label: 'Ore and fines' });
const mounting = param('mounting', 'fixed', { choices: ['fixed', 'mobile'], label: 'Mounting' });
presets({
  weathered: { coatedSteel: '#5f6d5f', structuralSteel: '#666a66', stainlessSteel: '#6b6f6c', ore: '#857868' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#8d969a', ore: '#a99b88' },
  gravelWash: { coatedSteel: '#2f6f9e', structuralSteel: '#4f5b62', stainlessSteel: '#b5c0c0', ore: '#b9a789' },
});

const p = assembly("trommel-screen");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Lathe along X: [[radius, x], ...] with x rising, centred on (y, z).
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// (y, z) outline extruded along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// Square frustum (hopper) from a bottom half-width to a top half-width.
const hopper = (r0, z0, r1, z1) => lathe([[r0 * Math.SQRT2, z0], [r1 * Math.SQRT2, z1]], 4).rotateZ(45);

const dark = '#26292b', concrete = '#a6a196', guard = '#e8c21a', rubber = '#1f2224', water = '#9fc6d8';
const mobile = mounting.value === 'mobile';
const TILT = 4;
const Zc = mobile ? 3000 : 3300; // drum centre height
const R = 1200; // screen radius
// Drum frame: built along X about the origin, tipped so the feed end (-X) is high.
const drum = (s) => s.rotateY(TILT).translate(0, 0, Zc);
const t = Math.tan((TILT * Math.PI) / 180);
const zAt = (x) => Zc - x * t; // drum axis height at x

// ---- Drum: feed section, screen panels, rings, strakes, riding tyres ----
add('feed-section', drum(latheX([[R + 60, -3600], [R + 60, -2700]], 0, 0, 18)).color(coatedSteel));
add('feed-end-plate', drum(latheX([[R + 60, -3700], [700, -3600]], 0, 0, 18)).color(coatedSteel));
add('screen-panels', drum(latheX([[R, -2700], [R, 3400]], 0, 0, 18)).color(stainlessSteel));
for (const x of [-1900, -700, 500, 1700]) add(`stiffening-ring-${x}`, drum(latheX([[R + 50, x - 50], [R + 50, x + 50]], 0, 0, 18)).color(coatedSteel));
for (let k = 0; k < 9; k++) add(`strake-${k}`, drum(blk(-2700, -40, R - 10, 3400, 40, R + 45).rotateX(k * 40 + 10)).color(coatedSteel));
add('discharge-lip', drum(latheX([[R + 70, 3400], [R + 70, 3600]], 0, 0, 18).subtract(latheX([[R - 120, 3390], [R - 120, 3610]], 0, 0, 18))).color(coatedSteel));
const tyres = [-3150, 2900];
for (const x of tyres) add(`riding-tyre-${x < 0 ? 'feed' : 'discharge'}`, drum(latheX([[R + 200, x - 170], [R + 200, x + 170]], 0, 0, 20)).color(structuralSteel));

// ---- Trunnion rollers, bearings and drive ----
const rr = 320, ra = (40 * Math.PI) / 180, rd = R + 200 + rr;
const deckZ = (x) => zAt(x) - rd * Math.cos(ra) - rr - 120;
for (const x of tyres) {
  for (const s of [-1, 1]) {
    const y = s * rd * Math.sin(ra), z = zAt(x) - rd * Math.cos(ra);
    const tag = `${x < 0 ? 'feed' : 'discharge'}-${s < 0 ? 'f' : 'b'}`;
    add(`trunnion-roller-${tag}`, latheX([[rr, x - 200], [rr, x + 200]], y, z, 14).color(structuralSteel));
    add(`roller-bearing-${tag}`, blk(x - 420, y - 160, deckZ(x), x + 420, y + 160, z).color(dark));
  }
  add(`roller-deck-${x < 0 ? 'feed' : 'discharge'}`, blk(x - 500, -1500, deckZ(x) - 160, x + 500, 1500, deckZ(x)).color(structuralSteel));
}
const dz = zAt(tyres[1]) - rd * Math.cos(ra), dy = -rd * Math.sin(ra);
add('drive-gearbox', blk(tyres[1] + 260, dy - 350, dz - 330, tyres[1] + 860, dy + 350, dz + 330).color(guard));
add('drive-motor', latheX([[300, tyres[1] + 860], [300, tyres[1] + 1900]], dy, dz, 14).color(structuralSteel));
add('drive-motor-cowl', latheX([[260, tyres[1] + 1900], [230, tyres[1] + 2100]], dy, dz, 14).color(dark));

// ---- Spray bar with drop nozzles along the top ----
add('spray-bar', drum(latheX([[70, -2700], [70, 3200]], 0, R + 400, 8)).color(stainlessSteel));
for (let x = -2200; x <= 2800; x += 1000) add(`spray-nozzle-${x}`, drum(rod(30, R + 80, R + 400, 6).translate(x, 0, 0)).color(stainlessSteel));
add('spray-supply', tube([3300, 0, zAt(3300) + R + 400], [3300, 1600, 600], 70, 8).color(water));

// ---- Feed hopper and chute into the high end ----
const fx = -5400, fz = zAt(-3700) + 400;
add('feed-chute', tube([fx + 600, 0, fz + 300], [-3300, 0, zAt(-3300)], 380, 4).color(coatedSteel));
add('feed-hopper', hopper(700, fz, 1500, fz + 1400).subtract(hopper(620, fz - 10, 1420, fz + 1410)).translate(fx, 0, 0).color(coatedSteel));
add('hopper-ore', lathe([[1300, fz + 1100], [300, fz + 1650]], 10).translate(fx, 0, 0).color(ore));
for (const [i, [x, y]] of [[-660, -660], [660, -660], [-660, 660], [660, 660]].entries()) {
  add(`hopper-leg-${i}`, blk(fx + x - 80, y - 80, mobile ? 1200 : 300, fx + x + 80, y + 80, fz + 120).color(structuralSteel));
}

// ---- Undersize hopper and cross conveyor to the fines pile ----
const ux0 = -2500, ux1 = 3300, uz = 1700;
add('undersize-hopper', profileYZ([[-1500, uz + 900], [1500, uz + 900], [400, uz], [-400, uz]], ux1 - ux0).translate((ux0 + ux1) / 2, 0, 0).color(coatedSteel));
add('cross-conveyor-belt', blk(-200, -7000, uz - 500, 1000, 400, uz - 420).rotateX(-6).color(rubber));
add('cross-conveyor-frame', blk(-150, -7000, uz - 780, 950, 400, uz - 500).rotateX(-6).color(structuralSteel));
add('fines-on-belt', profileYZ([[-6600, uz - 360], [300, uz - 360], [300, uz - 300], [-6600, uz - 300]], 600).rotateX(-6).translate(400, 0, 0).color(ore));
add('fines-pile', lathe([[2200, 0], [200, 1500]], 14).translate(400, -8200, 0).color(ore));

// ---- Oversize chute and rock pile at the low end ----
add('oversize-chute', profileYZ([[-1100, 0], [1100, 0], [1100, 900], [-1100, 900]], 260).rotateY(55).translate(4300, 0, zAt(3600) - 1500).color(coatedSteel));
add('oversize-pile', lathe([[2000, 0], [300, 1100]], 9).translate(5600, 0, 0).color(ore));
for (const [i, [x, y, r]] of [[5000, -1200, 300], [6000, -900, 260], [6400, 300, 320], [5300, 800, 280]].entries()) add(`oversize-rock-${i}`, sphere(r).translate(x, y, r * 0.6).subtract(blk(x - r - 10, y - r - 10, -r, x + r + 10, y + r + 10, 0)).color(ore));

// ---- Support: fixed steel frame on plinths, or a tandem trailer chassis ----
if (mobile) {
  add('chassis-beam-f', blk(-6400, -1100, 1000, 4200, -800, 1400).color(structuralSteel));
  add('chassis-beam-b', blk(-6400, 800, 1000, 4200, 1100, 1400).color(structuralSteel));
  for (const x of tyres) add(`chassis-post-${x < 0 ? 'feed' : 'discharge'}`, blk(x - 300, -1100, 1400, x + 300, 1100, deckZ(x) - 160).color(structuralSteel));
  for (const x of [1700, 3000]) {
    for (const y of [-1350, 1350]) {
      add(`wheel-${x}-${y < 0 ? 'f' : 'b'}`, rod(560, -220, 220, 16).rotateX(90).translate(x, y, 560).color(rubber));
      add(`hub-${x}-${y < 0 ? 'f' : 'b'}`, rod(300, -240, 240, 10).rotateX(90).translate(x, y, 560).color('#c9cdc8'));
    }
  }
  add('drawbar', blk(-7600, -150, 1100, -6400, 150, 1300).color(structuralSteel));
  for (const y of [-900, 900]) add(`landing-leg-${y < 0 ? 'f' : 'b'}`, blk(-6200, y - 100, 0, -6000, y + 100, 1000).color(guard));
} else {
  for (const x of tyres) {
    for (const y of [-1300, 1300]) add(`frame-leg-${x < 0 ? 'feed' : 'discharge'}-${y < 0 ? 'f' : 'b'}`, blk(x - 150, y - 150, 300, x + 150, y + 150, deckZ(x) - 160).color(structuralSteel));
    add(`plinth-${x < 0 ? 'feed' : 'discharge'}`, blk(x - 700, -1900, 0, x + 700, 1900, 300).color(concrete));
  }
  for (const y of [-1300, 1300]) add(`frame-tie-${y < 0 ? 'f' : 'b'}`, blk(tyres[0], y - 90, 1800, tyres[1], y + 90, 1980).color(structuralSteel));
  add('hopper-plinth', blk(fx - 1500, -1500, 0, fx + 1500, 1500, 300).color(concrete));
}

return p.model();
