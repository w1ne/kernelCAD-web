// SPDX-License-Identifier: CC0-1.0
// Litter control cannon: the towed mist cannon parked beside a landfill
// tipping face or an open recycling yard. It throws a fine water mist that
// knocks down dust and wets light film and paper, so they stay where they
// are dropped instead of blowing over the site fence.
// What makes it a mist cannon: a large open fan barrel on a slewing yoke,
// tilted up toward the tipping face, with a ring of spray nozzles around
// the mouth and a fan with its drive motor and rear guard inside. It sits
// on a single-axle site trailer with an A-frame drawbar and jockey wheel,
// a water tank, a generator and pump set, and rear stabiliser legs.
// Generic visualization geometry at about real size (4.4 m long, 1.8 m
// wide, 2.3 m high), millimetres, Z up, drawbar on -X, barrel mouth
// facing -Y.

meta({
  name: "litter-control-cannon",
  license: 'CC0-1.0',
  title: "Litter control cannon",
  description: "Towed mist cannon for dust and litter control at about real size: open fan barrel on a slewing yoke tilted up 25 degrees, spray nozzle ring round the mouth, fan blades, drive motor and rear guard inside, elevation ram, single-axle trailer with A-frame drawbar, jockey wheel, mudguards and rear stabiliser legs, water tank and generator set with exhaust. Material controls: painted body, water tank, stainless nozzles and fittings, rubber tyres. siteYellow, councilGreen, hireRed and weathered presets.",
  tags: ['mist cannon', 'fog cannon', 'dust suppression', 'litter control', 'odour control', 'landfill', 'tipping face', 'trailer', 'spray', 'recycling', 'waste management', 'residuals', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#e8b020', { label: 'Barrel, trailer and generator (painted steel)' });
const tank = param('tank', '#2f6fa8', { label: 'Water tank (polyethylene)' });
const metal = param('metal', '#c9ced1', { label: 'Nozzle ring, wheel rims and fittings (stainless)' });
const rubber = param('rubber', '#26292b', { label: 'Tyres and hoses (rubber)' });

presets({
  siteYellow: { body: '#e8b020', tank: '#2f6fa8', metal: '#c9ced1', rubber: '#26292b' },
  councilGreen: { body: '#3f7f4a', tank: '#e8e6dc', metal: '#b8c0c4', rubber: '#2a2d2f' },
  hireRed: { body: '#c0392b', tank: '#2a2d2f', metal: '#d8dcdc', rubber: '#1e2022' },
  weathered: { body: '#a8823a', tank: '#5a7a8a', metal: '#8f9496', rubber: '#3a3c3a' },
});

const p = assembly("litter-control-cannon");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Straight bar between two points in the XY plane at height z.
const barXY = (x0: number, y0: number, x1: number, y1: number, z: number, w: number, t: number) => {
  const L = Math.hypot(x1 - x0, y1 - y0), a = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  return box(L, w, t, true).rotateZ(a).translate((x0 + x1) / 2, (y0 + y1) / 2, z);
};

// Trailer chassis, deck and A-frame drawbar.
const CZ = 520;
for (const s of [-1, 1]) add(`chassis-rail-${s}`, blk(200, s * 450, CZ, 2400, 100, 140).color(body));
for (const x of [-950, 200, 1350]) add(`chassis-cross-${x}`, blk(x, 0, CZ, 100, 800, 140).color(body));
add("deck", blk(200, 0, CZ + 140, 2400, 1000, 12).color('#5d6366'));
for (const s of [-1, 1]) add(`drawbar-${s}`, barXY(-950, s * 450, -1900, 0, CZ + 70, 100, 100).color(body));
add("hitch", blk(-1950, 0, CZ + 20, 220, 120, 100).color('#5d6366'));
add("hitch-eye", torus(50, 15, 12).rotateX(90).translate(-2070, 0, CZ + 70).color(metal));
add("jockey-tube", cylinder(500, 40, 12).translate(-1600, 0, 160).color(metal));
add("jockey-handle", cylinder(140, 10, 8).rotateY(90).translate(-1600, 0, 680).color(rubber));
add("jockey-wheel", cylinder(80, 100, 20).rotateX(-90).translate(-1600, -40, 100).color(rubber));
// Single axle, wheels with rims, and mudguards.
add("axle", cylinder(1400, 40, 12).rotateX(-90).translate(200, -700, 330).color('#5d6366'));
for (const s of [-1, 1]) {
  const y = s * 690 - 110;
  add(`tyre-${s}`, cylinder(220, 330, 20).rotateX(-90).translate(200, y, 330).color(rubber));
  add(`rim-${s}`, cylinder(230, 190, 16).rotateX(-90).translate(200, y - 5, 330).color(metal));
  add(`mudguard-${s}`, cylinder(260, 400, 20).subtract(cylinder(280, 370, 20).translate(0, 0, -10)).subtract(blk(0, 250, -20, 900, 500, 300))
    .rotateX(-90).translate(200, y - 20, 330).color(body));
}
// Rear stabiliser legs.
for (const s of [-1, 1]) {
  add(`stabiliser-${s}`, blk(1350, s * 450, 40, 80, 80, CZ - 40).color(body));
  add(`stabiliser-pad-${s}`, blk(1350, s * 450, 0, 200, 200, 40).color('#5d6366'));
  add(`stabiliser-pin-${s}`, cylinder(140, 14, 8).rotateX(-90).translate(1350, s * 450 - 70, CZ - 120).color(metal));
}

// Water tank at the rear, generator and pump set at the front.
const DZ = CZ + 152;
add("water-tank", cylinder(900, 400, 24).translate(980, 0, DZ).color(tank));
add("tank-band", cylinder(60, 410, 24).translate(980, 0, DZ + 500).color(body));
add("tank-lid", cylinder(50, 160, 16).translate(980, 0, DZ + 900).color(rubber));
add("generator", blk(-700, 0, DZ, 560, 900, 620).color(body));
add("generator-roof", path().moveTo(-470, 0).lineTo(470, 0).lineTo(470, 40).lineTo(0, 110).lineTo(-470, 40).close().extrude(600)
  .rotateX(90).rotateZ(90).translate(-1000, 0, DZ + 620).color(body));
for (let i = 0; i < 5; i++) add(`louvre-${i}`, blk(-700, -452, DZ + 200 + i * 70, 400, 6, 30).color('#2f3437'));
add("control-box", blk(-560, -452, DZ + 40, 200, 30, 120).color('#d8dcdc'));
add("exhaust", cylinder(380, 40, 12).translate(-840, 300, DZ + 620).color('#5d6366'));
add("exhaust-cap", box(100, 100, 12, true).rotateY(-20).translate(-840, 300, DZ + 1010).color('#5d6366'));

// Slewing ring and yoke carrying the fan barrel.
const SX = 200;
const PZ = 1400;
add("slew-ring", cylinder(120, 340, 24).translate(SX, 0, DZ).color('#5d6366'));
add("slew-turret", cylinder(100, 300, 24).translate(SX, 0, DZ + 120).color(body));
for (const s of [-1, 1]) {
  add(`yoke-arm-${s}`, path().moveTo(-160, 0).lineTo(160, 0).lineTo(80, PZ - DZ - 220).lineTo(-80, PZ - DZ - 220).close().extrude(60)
    .rotateX(90).rotateZ(90).translate(SX + s * 440 - 30, 0, DZ + 220).color(body));
  add(`trunnion-${s}`, cylinder(120, 80, 16).rotateY(90).translate(SX + s * 440 - 60, 0, PZ).color(metal));
}
add("yoke-cross", blk(SX, 0, DZ + 220, 960, 300, 40).color(body));

// Fan barrel, built along +Z around the pivot and tilted up 25 degrees with
// the mouth toward -Y.
const tiltBarrel = (s: Shape) => s.rotateX(65).translate(SX, 0, PZ);
const L = 1400;
const R = 400;
add("barrel", tiltBarrel(cylinder(L, R, 28).subtract(cylinder(L + 20, R - 30, 28).translate(0, 0, -10)).translate(0, 0, -L / 2)).color(body));
add("barrel-bead-front", tiltBarrel(torus(R, 18, 28).translate(0, 0, L / 2)).color(body));
add("nozzle-ring", tiltBarrel(torus(R + 40, 20, 28).translate(0, 0, L / 2 + 20)).color(metal));
for (let i = 0; i < 12; i++) {
  const a = (i * 2 * Math.PI) / 12;
  add(`nozzle-${i}`, tiltBarrel(cylinder(60, 14, 8).translate((R + 40) * Math.cos(a), (R + 40) * Math.sin(a), L / 2 + 20)).color(metal));
}
// Fan inside: hub, six pitched blades, drive motor and rear guard bars.
add("fan-hub", tiltBarrel(sphere(110).scale(1, 1, 0.8).translate(0, 0, 0)).color('#5d6366'));
for (let i = 0; i < 6; i++) add(`fan-blade-${i}`, tiltBarrel(box(260, 120, 10, true).rotateX(25).translate(200, 0, 0).rotateZ(i * 60)).color('#5d6366'));
add("fan-motor", tiltBarrel(cylinder(380, 170, 20).translate(0, 0, -480)).color('#3a4044'));
for (const s of [-1, 1]) add(`motor-strut-${s}`, tiltBarrel(box(2 * R - 40, 40, 30, true).rotateZ(s * 45).translate(0, 0, -300)).color(body));
for (let i = -3; i <= 3; i++) add(`rear-guard-${i}`, tiltBarrel(box(16, 2 * Math.sqrt(R * R - (i * 100) ** 2) - 20, 16, true).translate(i * 100, 0, -L / 2 + 30)).color(metal));
// Elevation ram from the turret to the underside of the barrel.
add("elevation-ram", box(70, 70, 400, true).rotateX(46.8).translate(SX, -295, 1028).color(metal));
add("ram-cylinder", box(110, 110, 220, true).rotateX(46.8).translate(SX, -222, 960).color(body));

// Water pump on the deck, feeding the nozzle ring through a hose up the yoke.
add("pump", cylinder(220, 110, 16).rotateY(90).translate(-300, -330, DZ + 120).color('#3f7f4a'));
add("pump-motor", cylinder(260, 120, 16).rotateY(90).translate(-80, -330, DZ + 120).color(body));
add("feed-hose", box(50, 50, 700, true).rotateY(-18).translate(SX - 360, -200, DZ + 560).color(rubber));

return p.model();
