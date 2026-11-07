// SPDX-License-Identifier: CC0-1.0
// Desktop stapler: a full-strip stapler. What makes it one is the arched top
// arm pivoting on a hinge pin at the back of a long, low base, with a steel
// staple magazine riding under the arm and a driver nose at the front that
// comes down onto a crimping anvil set into the base. A rubber grip pad sits
// on the crown of the arm and a rubber pad keeps the base from sliding.
// Generic visualization geometry at about real size (about 200 mm long, 45 mm
// wide, 55 mm tall), millimetres, Z up, nose toward +X, lowest point on z = 0.
meta({
  name: 'stapler',
  license: 'CC0-1.0',
  title: 'Stapler',
  description: "Full-strip desktop stapler: arched powder-coated top arm on a rear hinge pin, steel staple magazine under the arm, driver nose over a crimping anvil, long base with rounded nose and rubber foot pad, rubber grip pad on the arm crown and a maker badge. Material controls: powder-coated steel, stainless steel, grip rubber, badge accent; professional, classroom and chrome presets.",
  tags: ['stapler', 'desktop stapler', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 900,
});

const powderCoatedSteel = param('powderCoatedSteel', '#2f5d8a', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#bfc5c7', { label: 'Stainless steel' });
const rubber = param('rubber', '#2b2f31', { label: 'Grip rubber' });
const badge = param('badge', '#d8a33c', { label: 'Badge accent' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { powderCoatedSteel: '#2f5d8a', stainlessSteel: '#bfc5c7', rubber: '#2b2f31', badge: '#d8a33c' },
  classroom: { powderCoatedSteel: '#d1503f', stainlessSteel: '#c3c8ca', rubber: '#3a3f42', badge: '#f2d25a' },
  chrome: { powderCoatedSteel: '#9ea6ab', stainlessSteel: '#dfe3e4', rubber: '#1d2022', badge: '#b23a32' },
});

const office = assembly('stapler');
const add = (name, shape) => office.part(name, shape.scale(k));

// Side profile [[x, z], ...] extruded t wide across Y, centred on y.
const sideXZ = (pts, t, y = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, y + t / 2, 0);
// Points on an arc about (cx, cz), angles in degrees.
const arc = (cx, cz, r, a0, a1, steps) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
  });
// Top line of the arm: rises from the hinge to a crown, then eases down to the nose.
const armZ = (x) => {
  const t = (x - 4) / 182;
  return 42 + 4 * t + 11 * Math.sin(Math.PI * t);
};
const sample = (x0, x1, steps, f) => Array.from({ length: steps + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / steps, f(x0 + ((x1 - x0) * i) / steps)]);

const HINGE = [14, 30];

// Base: long and low with a rounded nose and a rear tower carrying the hinge.
const basePts = [[0, 3], ...arc(188, 11, 8, -90, 90, 6), [40, 19], [30, 26], ...arc(HINGE[0], HINGE[1], 12, 60, 200, 5), [0, 22]];
add('base', sideXZ(basePts, 44).color(powderCoatedSteel));
add('base-foot-pad', sideXZ([[2, 0], [190, 0], [194, 3], [2, 3]], 40).color(rubber));
// Crimping anvil let into the base under the nose.
add('anvil', box(22, 26, 2, true).translate(184, 0, 20).color(stainlessSteel));
add('anvil-groove', box(14, 4, 0.6, true).translate(184, 0, 21.2).color(rubber));

// Staple magazine: a steel channel hinged at the back, under the arm.
add('magazine', sideXZ([[16, 26], [192, 26], [196, 30], [196, 36], [16, 36]], 28).color(stainlessSteel));
add('magazine-follower', sideXZ([[22, 27], [40, 27], [40, 35], [22, 35]], 30).color(rubber));

// Top arm: arched shell, thick at the hinge, dropping into the driver nose.
const armPts = [[4, 34], ...sample(4, 186, 14, armZ), [196, 46], [200, 40], [200, 34], [190, 36], [20, 36]];
add('top-arm', sideXZ(armPts, 40).color(powderCoatedSteel));
// Driver nose plate at the front of the arm.
add('driver-nose', sideXZ([[196, 26], [202, 28], [202, 44], [196, 46]], 32).color(stainlessSteel));
// Rubber grip pad following the crown of the arm.
const padTop = sample(70, 170, 10, (x) => armZ(x) + 2);
add('grip-pad', sideXZ([...padTop, ...padTop.slice().reverse().map(([x, z]) => [x, z - 4])], 30).color(rubber));
// Maker badge on the side of the arm.
add('badge', sideXZ([[90, 40], [130, 40], [130, 46], [90, 46]], 1, -20.6).color(badge));

// Hinge pin and its side cheeks.
add('hinge-pin', cylinder(48, 4.5, 12).rotateX(90).translate(HINGE[0], 24, HINGE[1]).color(stainlessSteel));
for (const s of [-1, 1]) {
  add(`hinge-cap-${s < 0 ? 'left' : 'right'}`, cylinder(2, 7, 12).rotateX(90).translate(HINGE[0], s * 24 + (s > 0 ? 2 : 0), HINGE[1]).color(stainlessSteel));
}

return office.model();
