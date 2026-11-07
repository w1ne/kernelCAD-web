// SPDX-License-Identifier: CC0-1.0
// Tape dispenser: a weighted desktop dispenser. What makes it one is the
// shoe-shaped body: a heavy low base with two side cheeks rising into a
// rounded hump at the back that cradles a roll of clear tape on a hub and
// axle, and a nose at the front carrying a serrated steel cutter blade. The
// tape runs forward from the top of the roll over the nose and hangs a short
// tab past the teeth. A rubber pad underneath stops it sliding.
// Generic visualization geometry at about real size (about 165 mm long,
// 60 mm wide, 110 mm tall, for 19 mm tape on a 25 mm core), millimetres,
// Z up, cutter toward +X, lowest point on z = 0.
meta({
  name: 'tape-dispenser',
  license: 'CC0-1.0',
  title: 'Tape dispenser',
  description: "Weighted desktop tape dispenser: shoe-shaped body with side cheeks rising into a rounded hump around a roll of clear tape on a hub and steel axle, front nose with a serrated stainless cutter, tape running over the nose to a hanging tab, and a rubber foot pad. Material controls: dispenser polymer, cutter stainless steel, foot rubber, tape film; professional, classroom and chrome presets.",
  tags: ['tape dispenser', 'office supplies', 'adhesive tape', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 1200,
});

const polymer = param('polymer', '#2a2d31', { label: 'Dispenser polymer' });
const stainlessSteel = param('stainlessSteel', '#bfc6c9', { label: 'Cutter stainless steel' });
const rubber = param('rubber', '#5a4f46', { label: 'Foot rubber' });
const tape = param('tape', '#d9d2b4', { label: 'Tape film' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#2a2d31', stainlessSteel: '#bfc6c9', rubber: '#5a4f46', tape: '#d9d2b4' },
  classroom: { polymer: '#d36249', stainlessSteel: '#c9ced0', rubber: '#3b3f42', tape: '#e8dfb0' },
  chrome: { polymer: '#a9b0b4', stainlessSteel: '#e2e5e6', rubber: '#1f2224', tape: '#c9b97f' },
});

const office = assembly('tape-dispenser');
const add = (name, shape) => office.part(name, shape.scale(k));

// Side profile [[x, z], ...] extruded t wide across Y, from y0 to y0 + t.
const sideXZ = (pts, t, y0) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Front profile [[y, z], ...] extruded t long along +X, starting at x0.
const frontYZ = (pts, t, x0) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Points on an arc about (cx, cz), angles in degrees.
const arc = (cx, cz, r, a0, a1, steps) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
  });
// Tube of outer radius r1, inner r0 and length h, lying across Y and centred on y = 0.
const tube = (r0, r1, h, n) => cylinder(h, r1, n).subtract(cylinder(h + 2, r0, n).translate(0, 0, -1)).rotateX(90).translate(0, h / 2, 0);

const ROLL = [-22, 64]; // roll centre (x, z)
const ROLL_R = 40;
const CORE_R = 19;
const HALF = 30; // half the body width
const CHEEK = 7; // cheek thickness

// Foot pad and heavy base block.
add('foot-pad', sideXZ([[-80, 0], [76, 0], [76, 3], [-80, 3]], 2 * HALF - 6, -HALF + 3).color(rubber));
add('base', sideXZ([[-82, 3], [78, 3], [82, 10], [82, 18], [-46, 18], [-82, 30]], 2 * HALF, -HALF).color(polymer));

// Side cheeks: low at the front nose, rising into a hump round the roll.
const cheekPts = [[-84, 12], [-80, 3], [80, 3], [84, 12], [84, 40], [79, 48], [64, 51], ...arc(ROLL[0], ROLL[1], ROLL_R + 7, 38, 205, 12), [-84, 30]];
for (const s of [-1, 1]) {
  const side = s < 0 ? 'left' : 'right';
  add(`cheek-${side}`, sideXZ(cheekPts, CHEEK, s < 0 ? -HALF : HALF - CHEEK).color(polymer));
  // Axle boss on the outside of each cheek.
  add(`axle-boss-${side}`, cylinder(2, 12, 16).rotateX(90).translate(ROLL[0], s < 0 ? -HALF : HALF + 2, ROLL[1]).color(stainlessSteel));
}
// Nose block between the cheeks under the cutter.
add('nose', sideXZ([[44, 18], [82, 18], [82, 42], [77, 48], [56, 46]], 2 * HALF - 2 * CHEEK, -HALF + CHEEK).color(polymer));

// Tape roll on its hub and axle.
add('axle', cylinder(2 * HALF, 4, 10).rotateX(90).translate(ROLL[0], HALF, ROLL[1]).color(stainlessSteel));
add('hub', tube(4, CORE_R, 20, 18).translate(ROLL[0], 0, ROLL[1]).color(polymer));
add('tape-roll', tube(CORE_R + 2, ROLL_R, 19, 24).translate(ROLL[0], 0, ROLL[1]).color(tape));
add('roll-core', tube(CORE_R, CORE_R + 2, 19, 18).translate(ROLL[0], 0, ROLL[1]).color(rubber));

// Tape web: from the top of the roll forward over the nose, then a hanging tab.
const tapeTop = [ROLL[0] + 8, ROLL[1] + ROLL_R - 0.5];
const tapeLip = [79, 49];
const web = (p0, p1, t) => {
  const dx = p1[0] - p0[0];
  const dz = p1[1] - p0[1];
  const n = Math.hypot(dx, dz);
  const ox = (-dz / n) * t;
  const oz = (dx / n) * t;
  return [p0, p1, [p1[0] + ox, p1[1] + oz], [p0[0] + ox, p0[1] + oz]];
};
add('tape-web', sideXZ(web(tapeTop, tapeLip, 0.8), 19, -9.5).color(tape));
add('tape-tab', sideXZ(web([tapeLip[0] + 1, tapeLip[1] + 1], [88, 38], 0.8), 19, -9.5).color(tape));

// Serrated cutter blade across the front of the nose.
const teeth = [[-HALF + CHEEK, 0], [HALF - CHEEK, 0]];
const N = 12;
for (let i = N; i >= 0; i -= 1) {
  const y = -HALF + CHEEK + ((2 * HALF - 2 * CHEEK) * i) / N;
  teeth.push([y, i % 2 === 0 ? 10 : 13]);
}
add('cutter-blade', frontYZ(teeth, 1.5, 81).translate(0, 0, 38).color(stainlessSteel));
add('cutter-screw-left', cylinder(2, 2.5, 8).rotateY(90).translate(82.5, -12, 42).color(stainlessSteel));
add('cutter-screw-right', cylinder(2, 2.5, 8).rotateY(90).translate(82.5, 12, 42).color(stainlessSteel));

return office.model();
