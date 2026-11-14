// SPDX-License-Identifier: CC0-1.0
// In-vessel composter: a rotating-drum composter that turns food and
// garden waste into stabilised compost in a few days. What makes it that
// machine rather than a tank: a long insulated drum lying almost flat on
// trunnion rollers under two steel riding rings, a girth gear and geared
// motor turning it slowly, a feed hopper and screw conveyor pushing waste
// into the high end, a discharge hood at the low end dropping compost
// through a trommel screen, and an aeration fan blowing in while an
// exhaust duct carries the moist air off to a biofilter.
// Generic visualization geometry at about real size (14 m long, 3.6 m
// wide, 4.2 m high at the hopper), millimetres, Z up, discharge toward -Y.

meta({
  name: "in-vessel-composter",
  license: 'CC0-1.0',
  title: "In-vessel composter",
  description: "Rotating-drum in-vessel composter at about real size: long insulated drum with cladding seams on two riding rings and trunnion rollers, girth gear and geared drive motor, feed hopper and screw conveyor into the high end, discharge hood with trommel screen and compost pile at the low end, aeration fan and exhaust duct to a biofilter, concrete plinths. Material controls: drum cladding, frame paint, rings and rollers steel, ducts and trim. municipal, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "composting", "in-vessel composter", "rotating drum", "drum composter", "organics", "food waste", "trunnion", "riding ring", "trommel", "biofilter", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cladding = param('cladding', '#4f8a5b', { label: 'Drum insulation cladding' });
const frame = param('frame', '#3d4a52', { label: 'Frame, hood and hopper (paint)' });
const rings = param('rings', '#a9b0b3', { label: 'Riding rings and rollers (steel)' });
const ducts = param('ducts', '#d9dcdd', { label: 'Air ducts and safety trim' });

presets({
  municipal: { cladding: '#4f8a5b', frame: '#3d4a52', rings: '#a9b0b3', ducts: '#d9dcdd' },
  weathered: { cladding: '#6d7a5f', frame: '#4f5254', rings: '#86857e', ducts: '#a9aca8' },
  stainless: { cladding: '#c6cbcd', frame: '#2f5d9a', rings: '#e0e4e5', ducts: '#b5bcbf' },
  highVisibility: { cladding: '#e0702a', frame: '#2b2f31', rings: '#c9ced1', ducts: '#f2d21b' },
});

const p = assembly("in-vessel-composter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) side profile extruded along X, centred on x = cx.
const profileYZ = (pts, t: number, cx = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90).translate(cx, 0, 0);
const concrete = '#b9b6ad', compost = '#4a3727';

const R = 1400, L = 10000, ZA = 2000, TILT = 1.5; // drum radius, length, axis height at y = 0, tilt (deg)
// Cylinder along the drum axis from y0, rising gently toward +Y.
const onAxis = (y0: number, len: number, r: number, seg = 24) => cylinder(len, r, seg).rotateX(-90).translate(0, y0, 0).rotateX(TILT).translate(0, 0, ZA);
const axisZ = (y: number) => ZA + y * Math.tan((TILT * Math.PI) / 180);

// Drum: cladding shell with longitudinal seams and end bands.
add("drum", onAxis(0, L, R).color(cladding));
for (let k = 0; k < 8; k++) add(`seam-${k}`, box(40, L - 200, 30, true).translate(0, L / 2, R + 5).rotateY(k * 45).rotateX(TILT).translate(0, 0, ZA).color('#3b6a46'));
for (const y of [0, L - 120]) add(`end-band-${y}`, onAxis(y, 120, R + 40).color(rings));

// Riding rings on trunnion rollers, each on a concrete plinth.
for (const [i, y] of [2200, 7800].entries()) {
  add(`riding-ring-${i}`, onAxis(y, 300, R + 140).subtract(onAxis(y - 10, 320, R + 20)).color(rings));
  const RC = R + 140 + 230, zr = axisZ(y + 150) - RC * Math.cos(Math.PI / 6); // roller centre distance and height
  for (const s of [-1, 1]) {
    const x = s * RC * Math.sin(Math.PI / 6);
    add(`roller-${i}-${s}`, onAxis(0, 360, 230, 16).translate(x, y - 30, zr - ZA).color(rings));
    add(`roller-bearing-${i}-${s}`, blk(x, y + 150, zr - 330, 360, 700, 260).color(frame));
  }
  add(`plinth-${i}`, blk(0, y + 150, 0, 2400, 1100, zr - 330).color(concrete));
}

// Girth gear and geared drive between the rings.
const GY = 5000;
add("girth-gear", onAxis(GY, 180, R + 220, 32).subtract(onAxis(GY - 10, 200, R + 20)).color(rings));
for (let k = 0; k < 24; k++) add(`gear-tooth-${k}`, box(80, 180, 90, true).translate(0, 90, R + 250).rotateY(k * 15).translate(0, GY, 0).rotateX(TILT).translate(0, 0, ZA).color(rings));
add("pinion-guard", blk(R + 300, GY + 90, 0, 900, 700, axisZ(GY) - 300).color('#5a6266'));
add("pinion-guard-top", blk(R + 300, GY + 90, axisZ(GY) - 300, 900, 700, 80).color(ducts));
add("drive-gearbox", blk(R + 1150, GY + 90, 0, 700, 800, 1300).color(frame));
add("drive-motor", cylinder(900, 260, 14).rotateY(90).translate(R + 1500, GY + 90, 900).color(frame));

// Feed hopper and screw conveyor into the high end.
const FY = L + 900;
add("inlet-head", profileYZ([[L - 50, axisZ(L) - R - 150], [L + 450, axisZ(L) - R - 150], [L + 450, axisZ(L) + R + 150], [L - 50, axisZ(L) + R + 150]], 2 * R + 300).color(frame));
add("screw-tube", cylinder(1700, 280, 14).rotateX(-90).translate(0, L + 300, axisZ(L) - 400).color(frame));
add("feed-hopper", profileYZ([[FY - 500, axisZ(L) - 200], [FY + 500, axisZ(L) - 200], [FY + 900, axisZ(L) + 1700], [FY - 900, axisZ(L) + 1700]], 1800)
  .subtract(profileYZ([[FY - 420, axisZ(L) - 120], [FY + 420, axisZ(L) - 120], [FY + 820, axisZ(L) + 1800], [FY - 820, axisZ(L) + 1800]], 1640)).color(frame));
add("hopper-rim", blk(0, FY, axisZ(L) + 1700, 1900, 1900, 60).subtract(blk(0, FY, axisZ(L) + 1650, 1640, 1640, 200)).color(ducts));
add("hopper-feedstock", blk(0, FY, axisZ(L) + 800, 1500, 1300, 600).color('#7a6a3a'));
for (const s of [-1, 1]) for (const d of [-1, 1]) add(`hopper-leg-${s}-${d}`, blk(s * 750, FY + d * 450, 0, 140, 140, axisZ(L) - 200).color(frame));
add("screw-motor", cylinder(600, 200, 14).rotateX(-90).translate(0, FY + 900, axisZ(L) - 400).color(frame));

// Discharge hood at the low end with a trommel screen and compost pile.
add("discharge-hood", profileYZ([[-500, 300], [150, 300], [150, ZA + R + 200], [-300, ZA + R + 350], [-900, ZA + R], [-900, 1200]], 2 * R + 400).color(frame));
add("hood-door", blk(-R - 210, -350, 1300, 20, 500, 900).color(ducts));
add("trommel", cylinder(2200, 600, 18).rotateX(90).rotateX(6).translate(0, -1100, 1150).subtract(cylinder(2400, 540, 18).rotateX(90).rotateX(6).translate(0, -1000, 1150)).color(rings));
for (let k = 0; k < 5; k++) add(`trommel-band-${k}`, cylinder(60, 640, 18).rotateX(90).rotateX(6).translate(0, -1300 - k * 450, 1150 - (k * 450 + 200) * Math.tan((6 * Math.PI) / 180)).color(frame));
for (const [i, y, h] of [[0, -1500, 500], [1, -3000, 340]]) add(`trommel-stand-${i}`, blk(0, y, 0, 1400, 200, h).color(frame));
add("compost-pile", extrudePolygon([[-1600, 0], [1600, 0], [900, 700], [-700, 850]], 1800).rotateX(90).translate(0, -3300, 0).color(compost));
add("overs-bin", blk(2100, -3600, 0, 1200, 900, 700).subtract(blk(2100, -3600, 80, 1100, 800, 700)).color(ducts));

// Aeration fan blowing in at the low end, exhaust duct to the biofilter.
add("fan-housing", cylinder(500, 550, 18).rotateY(90).translate(-R - 2000, -300, 700).color(ducts));
add("fan-motor", cylinder(500, 250, 14).rotateY(90).translate(-R - 2500, -300, 700).color(frame));
add("fan-duct", blk(-R - 1200, -300, 500, 1000, 400, 400).color(ducts));
add("exhaust-riser", cylinder(ZA + R + 900, 260, 14).translate(R - 300, L + 200, 0).color(ducts));
add("exhaust-run", cylinder(3000, 260, 14).rotateY(90).translate(R - 300, L + 200, ZA + R + 900).color(ducts));
add("exhaust-drop", cylinder(ZA + R + 900, 260, 14).translate(R + 2700, L + 200, 0).color(ducts));
add("biofilter", blk(R + 3600, L - 400, 0, 2400, 3000, 1100).subtract(blk(R + 3600, L - 400, 200, 2200, 2800, 1100)).color(concrete));
add("biofilter-media", blk(R + 3600, L - 400, 200, 2200, 2800, 760).color('#6b4f34'));

return p.model();
