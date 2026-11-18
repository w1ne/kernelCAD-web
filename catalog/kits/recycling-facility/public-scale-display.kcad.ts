// SPDX-License-Identifier: CC0-1.0
// Public scale display: the big remote weight readout that stands at the end
// of a weighbridge so a driver can read the gross weight from the cab. What
// makes it a scale display rather than a sign: a wide black-faced LED cabinet
// with large seven-segment digits and a "kg" unit, a sun hood with side
// cheeks so the digits stay readable in daylight, a stop/go signal pair under
// it telling the driver when the weight is settled, and twin galvanised posts
// on a concrete base with a cable duct running up to the cabinet. The
// reading on the digits is a parameter.
// Generic visualization geometry at about real size (1.6 m wide cabinet,
// digits 300 mm tall, 3.4 m overall), millimetres, Z up, face on -Y.

meta({
  name: "public-scale-display",
  license: 'CC0-1.0',
  title: "Public scale display",
  description: "Remote weighbridge weight display at about real size: wide black-faced LED cabinet with 300 mm seven-segment digits and kg unit, sun hood with side cheeks, stop/go signal pair, twin posts on a concrete base with a cable duct and a 'read weight' plate. Choice of reading and signal state. Material controls: cabinet, posts, LED digits and signage. redLed, amberLed and greenLed presets.",
  tags: ["weighbridge", "scale display", "remote display", "weight display", "led display", "truck scale", "recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#2c4f7c', { label: 'Cabinet and hood (powder coat)' });
const posts = param('posts', '#a7adaa', { label: 'Posts (galvanised steel)' });
const led = param('led', '#ff3b2e', { label: 'LED digits' });
const signage = param('signage', '#f0c419', { label: 'Signage plate' });
const reading = param('reading', '24680', { choices: ['24680', '38260', '7140', '0'], label: 'Displayed weight (kg)' });
const signal = param('signal', 'go', { choices: ['stop', 'go'], label: 'Driver signal' });

presets({
  redLed: { cabinet: '#2c4f7c', posts: '#a7adaa', led: '#ff3b2e', signage: '#f0c419' },
  amberLed: { cabinet: '#3a3d40', posts: '#a7adaa', led: '#ffb020', signage: '#f0c419' },
  greenLed: { cabinet: '#4f7a5a', posts: '#c3c9cb', led: '#4dff6a', signage: '#e9ebe6' },
});

const p = assembly("public-scale-display");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const CW = 1600;
const CH = 560;
const CD = 260;
const CZ = 2600; // cabinet underside
const YF = -CD / 2;

// Concrete base and twin posts with base plates.
add("base", blk(0, 0, 0, 1500, 600, 150).color('#9a9b94'));
for (const [i, x] of [[0, -500], [1, 500]] as const) {
  add(`plate-${i}`, blk(x, 0, 150, 260, 260, 20).color(posts));
  for (const [dx, dy] of [[-90, -90], [90, -90], [-90, 90], [90, 90]]) add(`nut-${i}-${dx < 0 ? 'l' : 'r'}${dy < 0 ? 'f' : 'b'}`, cylinder(30, 16, 6).translate(x + dx, dy, 170).color('#5d6366'));
  add(`post-${i}`, blk(x, 0, 170, 120, 120, CZ - 170 + 200).color(posts));
}
add("cable-duct", blk(-500, 75, 170, 50, 30, CZ - 170).color('#3a3d40'));
add("cross-bar", blk(0, 0, 1700, 1100, 80, 80).color(posts));

// Cabinet with recessed black face.
add("cabinet-body", blk(0, 0, CZ, CW, CD, CH).color(cabinet));
add("face", blk(0, YF - 3, CZ + 40, CW - 80, 6, CH - 80).color('#121416'));
// Sun hood and side cheeks.
add("hood", box(CW + 80, 360, 24, true).rotateX(-8).translate(0, YF - 40, CZ + CH + 20).color(cabinet));
for (const [i, x] of [[0, -CW / 2 - 20], [1, CW / 2 + 20]] as const) {
  add(`cheek-${i}`, extrudePolygon([[YF - 210, CH + 40], [CD / 2, CH + 20], [CD / 2, 0], [YF - 20, 0]], 20).rotateX(90).translate(0, 10, 0).rotateZ(90).translate(x, 0, CZ).color(cabinet));
}

// Seven-segment digits right-aligned on the face, then the kg unit.
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
const DW = 150;
const DH = 320;
const T = 34;
const FY = YF - 8;
const digit = (n: number, x: number, z: number) => SEG[n].split('').map((k: string) => {
  const hz = { a: DH - T / 2, g: DH / 2, d: T / 2 };
  const vx = { b: [DW / 2, (3 * DH) / 4], c: [DW / 2, DH / 4], e: [-DW / 2, DH / 4], f: [-DW / 2, (3 * DH) / 4] };
  return [k, k in hz ? blk(x, FY, z + hz[k] - T / 2, DW - 10, 6, T) : blk(x + vx[k][0], FY, z + vx[k][1] - DH / 4 + 8, T, 6, DH / 2 - 16)];
});
const chars = reading.value.split('').map(Number);
const DZ = CZ + 120;
const rightX = 380;
chars.forEach((n, i) => {
  const x = rightX - (chars.length - 1 - i) * (DW + 60);
  for (const [k, seg] of digit(n, x, DZ)) add(`digit-${i}-${k}`, seg.color(led));
});
// "kg" in block letters.
const KX = 560;
add("unit-k-stem", blk(KX - 50, FY, DZ, 26, 6, 200).color(led));
add("unit-k-arm-a", box(26, 6, 120, true).rotateY(40).translate(KX - 5, FY, DZ + 110).color(led));
add("unit-k-arm-b", box(26, 6, 100, true).rotateY(-40).translate(KX - 10, FY, DZ + 38).color(led));
add("unit-g-bowl", blk(KX + 80, FY, DZ, 80, 6, 26).color(led));
add("unit-g-top", blk(KX + 80, FY, DZ + 104, 80, 6, 26).color(led));
add("unit-g-left", blk(KX + 53, FY, DZ, 26, 6, 130).color(led));
add("unit-g-right", blk(KX + 107, FY, DZ - 60, 26, 6, 190).color(led));
add("unit-g-tail", blk(KX + 80, FY, DZ - 60, 80, 6, 26).color(led));

// Status LEDs along the bottom of the face.
for (let k = 0; k < 3; k++) add(`status-${k}`, cylinder(6, 16, 10).rotateX(90).translate(-640 + k * 60, FY + 2, CZ + 70).color(k === 0 ? led : '#3a3d40'));

// Stop/go signal pair hung under the cabinet.
const stop = signal.value === 'stop';
add("signal-bracket", blk(0, 0, CZ - 60, 700, 120, 60).color(posts));
for (const [i, x, on, offC, onC] of [[0, -180, stop, '#4a1612', '#ff3b2e'], [1, 180, !stop, '#163d1f', '#3cdc5a']] as const) {
  add(`signal-head-${i}`, blk(x, -20, CZ - 380, 280, 180, 320).color('#1b1c1d'));
  add(`signal-lamp-${i}`, cylinder(14, 100, 18).rotateX(90).translate(x, -110, CZ - 220).color(on ? onC : offC));
  add(`signal-visor-${i}`, box(240, 140, 14, true).rotateX(-15).translate(x, -170, CZ - 100).color('#1b1c1d'));
}

// "Read weight" plate on the posts at driver eye height.
add("read-plate", blk(0, -50, 1820, 900, 10, 320).color(signage));
add("read-plate-arrow", extrudePolygon([[-60, 0], [60, 0], [60, 90], [120, 90], [0, 200], [-120, 90], [-60, 90]], 6).rotateX(90).translate(-300, -56, 1880).color('#1b1c1d'));
for (let k = 0; k < 6; k++) add(`read-plate-word-${k}`, blk(-100 + k * 80, -57, 1930, 50, 4, 100).color('#1b1c1d'));

return p.model();
