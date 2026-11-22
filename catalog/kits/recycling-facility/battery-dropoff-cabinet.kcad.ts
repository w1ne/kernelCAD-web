// SPDX-License-Identifier: CC0-1.0
// Battery drop-off cabinet: the outdoor steel locker at a recycling centre
// where the public posts spent batteries, sorted by chemistry. What makes it
// that cabinet rather than a box: a pitched rain roof over a louvred,
// ventilated body on a bunded spill sump, an angled front console with
// three colour-coded posting flaps (household, lithium, lead-acid), lockable
// double service doors below, a hazard diamond and sign board, a fire
// extinguisher on the side and two bollards guarding the front.
// Generic visualization geometry at about real size (1.8 m wide, 2.3 m
// high), millimetres, Z up, posting front faces -Y.

meta({
  name: "battery-dropoff-cabinet",
  license: 'CC0-1.0',
  title: "Battery drop-off cabinet",
  description: "Public battery collection locker at about real size: pitched rain roof, louvred ventilated steel body on a bunded spill sump, angled console with three colour-coded posting flaps (household, lithium, lead-acid), lockable double service doors, hazard diamond, sign board, side fire extinguisher and front bollards. Material controls: cabinet body, roof, posting flaps and safety trim. council, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "battery recycling", "battery collection", "drop-off", "hazardous waste", "lithium battery", "cabinet", "civic amenity", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#3f7d4a', { label: 'Cabinet body (paint)' });
const roof = param('roof', '#5a6266', { label: 'Rain roof' });
const flaps = param('flaps', 'chemistry', { choices: ['chemistry', 'single'], label: 'Posting flap colours' });
const trim = param('trim', '#f0b429', { label: 'Bollards, sump and safety trim' });

presets({
  council: { body: '#3f7d4a', roof: '#5a6266', trim: '#f0b429' },
  weathered: { body: '#5b6b55', roof: '#6e6a62', trim: '#a8893f' },
  stainless: { body: '#c6cbcd', roof: '#8d969a', trim: '#2f5d9a' },
  highVisibility: { body: '#f2d21b', roof: '#2b2f31', trim: '#d9692a' },
});

const p = assembly("battery-dropoff-cabinet");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1800, D = 900, Z0 = 220, HB = 1850; // body width, depth, sump top, body height
const ZT = Z0 + HB;

// Bunded spill sump and cabinet body.
add("sump", blk(0, 0, 0, W + 120, D + 120, Z0).color(trim));
add("sump-grating", blk(0, 0, Z0 - 20, W + 40, D + 40, 20).color('#5a6266'));
add("body", blk(0, 0, Z0, W, D, HB).color(body));

// Pitched rain roof with overhang and gable trims.
add("roof", profileYZ([[-D / 2 - 220, ZT], [D / 2 + 220, ZT], [D / 2 + 220, ZT + 40], [0, ZT + 280], [-D / 2 - 220, ZT + 40]], W + 260).color(roof));
add("ridge-vent", blk(0, 0, ZT + 250, W - 200, 160, 70).color(roof));

// Angled posting console across the upper front.
const CZ = Z0 + 1050;
add("console", profileYZ([[-D / 2, CZ], [-D / 2 - 260, CZ], [-D / 2 - 260, CZ + 60], [-D / 2, CZ + 360]], W - 80).color(body));
const flapColors = flaps.value === 'single' ? ['#e7e9e6', '#e7e9e6', '#e7e9e6'] : ['#2f5d9a', '#d9692a', '#c8202a'];
const slope = Math.atan2(300, 260), nz = Math.cos(slope), ny = -Math.sin(slope);
const cy = -D / 2 - 130, cz = CZ + 210;
['household', 'lithium', 'lead-acid'].forEach((k, i) => {
  const x = (i - 1) * 560;
  add(`slot-${k}`, box(420, 180, 16, true).rotateX((slope * 180) / Math.PI).translate(x, cy + 6 * ny, cz + 6 * nz).color('#1f2224'));
  add(`flap-${k}`, box(400, 150, 18, true).rotateX((slope * 180) / Math.PI).translate(x, cy + 14 * ny - 8, cz + 14 * nz - 10).color(flapColors[i]));
  add(`label-${k}`, blk(x, -D / 2 - 3, CZ + 390, 420, 6, 120).color(flapColors[i]));
  add(`label-text-${k}`, blk(x, -D / 2 - 7, CZ + 435, 300, 4, 30).color('#f4f4f0'));
});

// Lockable double service doors with hinges and handles.
for (const s of [-1, 1]) {
  add(`door-${s}`, blk(s * (W / 4 + 5), -D / 2 - 8, Z0 + 80, W / 2 - 50, 16, CZ - Z0 - 160).color(body));
  add(`handle-${s}`, blk(s * 70, -D / 2 - 30, Z0 + 450, 40, 30, 220).color('#c9ced1'));
  for (const z of [Z0 + 200, CZ - 200]) add(`hinge-${s}-${z}`, cylinder(120, 18, 8).translate(s * (W / 2 - 30), -D / 2 - 18, z).color('#5a6266'));
}
add("padlock", blk(0, -D / 2 - 40, Z0 + 520, 70, 30, 90).color('#c9a227'));

// Louvred vents on both sides.
for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) {
  add(`louvre-${sx}-${k}`, box(30, D - 300, 50, true).rotateY(sx * 35).translate(sx * (W / 2 + 10), 0, Z0 + 1150 + k * 90).color(roof));
}

// Hazard diamond and sign board above the console.
add("sign-board", blk(0, -D / 2 - 6, ZT - 250, W - 200, 10, 220).color('#f4f4f0'));
add("sign-text", blk(-150, -D / 2 - 12, ZT - 160, 900, 6, 50).color('#1f2224'));
add("sign-stripe", blk(0, -D / 2 - 12, ZT - 230, W - 240, 6, 40).color(trim));
add("hazard-diamond", box(180, 8, 180, true).rotateY(45).translate(W / 2 - 300, -D / 2 - 14, ZT - 140).color('#f4f4f0'));
add("hazard-core", box(130, 8, 130, true).rotateY(45).translate(W / 2 - 300, -D / 2 - 18, ZT - 140).color('#c8202a'));

// Fire extinguisher on a bracket on the -X side.
add("extinguisher-bracket", blk(-W / 2 - 25, -150, Z0 + 500, 50, 120, 500).color('#5a6266'));
add("extinguisher", cylinder(520, 85, 12).translate(-W / 2 - 140, -150, Z0 + 420).color('#c8202a'));
add("extinguisher-head", sphere(85).translate(-W / 2 - 140, -150, Z0 + 940).color('#c8202a'));
add("extinguisher-valve", blk(-W / 2 - 140, -150, Z0 + 990, 60, 120, 60).color('#2b2f31'));

// Bollards guarding the front corners.
for (const s of [-1, 1]) {
  add(`bollard-${s}`, cylinder(1000, 70, 12).translate(s * (W / 2 + 200), -D / 2 - 600, 0).color(trim));
  add(`bollard-band-${s}`, cylinder(120, 72, 12).translate(s * (W / 2 + 200), -D / 2 - 600, 760).color('#1f2224'));
  add(`bollard-cap-${s}`, sphere(70).translate(s * (W / 2 + 200), -D / 2 - 600, 1000).color(trim));
}

return p.model();
