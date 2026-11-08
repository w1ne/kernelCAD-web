// SPDX-License-Identifier: CC0-1.0
// Hand basket: the moulded plastic carry basket stacked by a shop entrance.
// What makes it a hand basket rather than a crate: a tapered tub that nests
// into the next one, rows of oval vent slots punched through the walls, a
// thick rolled rim with a printed store-logo panel on the front, and two
// folding wire handles with plastic grips, one raised to carry and one laid
// flat on the rim. Generic visualization geometry at about real size
// (420 x 300 mm rim, 230 mm tub), millimetres, Z up, front toward -Y,
// base on z = 0.

meta({
  name: "handbasket",
  license: 'CC0-1.0',
  title: "Hand basket",
  description: "Moulded plastic shop hand basket at about real size: tapered nesting tub with rows of vent slots punched through the walls, rolled rim with a printed logo panel on the front, and two folding wire handles with plastic grips (one raised, one laid on the rim). Material controls: basket plastic, handle wire, grips, logo panel. classicRed, freshGreen and premiumBlack presets; handle pose choice.",
  tags: ['hand basket', 'shopping basket', 'carry basket', 'plastic basket', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const plastic = param('plastic', '#c8302c', { label: 'Basket plastic' });
const wire = param('wire', '#b9c0c4', { label: 'Handle wire' });
const grip = param('grip', '#1f2124', { label: 'Handle grips' });
const logo = param('logo', '#f4f1e8', { label: 'Logo panel' });
const handles = param('handles', 'oneUp', { choices: ['oneUp', 'bothDown'], label: 'Handle pose' });

presets({
  classicRed: { plastic: '#c8302c', wire: '#b9c0c4', grip: '#1f2124', logo: '#f4f1e8' },
  freshGreen: { plastic: '#3f8f4a', wire: '#c9ced2', grip: '#2a3a2e', logo: '#f2efd8' },
  premiumBlack: { plastic: '#25282b', wire: '#c39a4a', grip: '#6b4a2e', logo: '#c39a4a' },
});

const p = assembly("handbasket");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Tapered tub: outer frustum minus an inner frustum, open at the top.
const H = 230;
const outer = rectPath(180, 125).loft(rectPath(205, 145), { spacing: H, ruled: true });
const inner = rectPath(172, 117).loft(rectPath(199, 139), { spacing: H, ruled: true }).translate(0, 0, 10);
let tub = outer.subtract(inner);
// Oval vent slots: three rows on the long walls, three on the ends.
for (let row = 0; row < 3; row++) {
  const z = 50 + row * 55;
  for (let k = -4; k <= 4; k++) tub = tub.subtract(blk(k * 38, 0, z, 18, 360, 34));
  for (let k = -2; k <= 2; k++) tub = tub.subtract(blk(0, k * 40, z, 480, 20, 34));
}
add("tub", tub.color(plastic));
// Rolled rim and nesting feet.
add("rim", blk(0, 0, H - 6, 430, 310, 22).subtract(blk(0, 0, H - 10, 396, 276, 40)).color(plastic));
for (const [x, y] of [[-150, -100], [150, -100], [-150, 100], [150, 100]]) {
  add(`foot-${x < 0 ? 'l' : 'r'}${y < 0 ? 'f' : 'b'}`, blk(x, y, 0, 40, 30, 4).color(plastic));
}
// Logo panel on the front rim band.
add("logo-panel", blk(0, -152, H - 2, 150, 4, 14).color(logo));
add("logo-panel-lower", blk(0, -142, 168, 120, 4, 30).color(logo));

// Handle pivots at each end of the long walls.
const PZ = H - 10;
for (const s of [-1, 1]) {
  add(`pivot-${s < 0 ? 'l' : 'r'}-f`, cylinder(10, 9, 10).rotateX(90).translate(s * 150, -146, PZ).color(wire));
  add(`pivot-${s < 0 ? 'l' : 'r'}-b`, cylinder(10, 9, 10).rotateX(90).translate(s * 150, 156, PZ).color(wire));
}
// A U-shaped wire handle hinged on one long wall: raised to carry, or
// dropped outward so it hangs against the outside of the wall.
const handle = (yWall: number, side: number, up: boolean) => {
  const L = 220;
  const a = ((up ? 75 : -58) * Math.PI) / 180;
  const top = [yWall - side * L * Math.cos(a), PZ + L * Math.sin(a)];
  const parts = [];
  for (const x of [-150, 150]) parts.push(rod([x, yWall, PZ], [x * 0.55, top[0], top[1]], 4));
  parts.push(rod([-82.5, top[0], top[1]], [82.5, top[0], top[1]], 4));
  return { parts, top };
};
const hf = handle(-146, 1, handles.value === 'oneUp');
const hb = handle(146, -1, false);
hf.parts.forEach((s, i) => add(`front-handle-wire-${i}`, s.color(wire)));
hb.parts.forEach((s, i) => add(`back-handle-wire-${i}`, s.color(wire)));
add("front-grip", cylinder(120, 14, 12).rotateY(90).translate(-60, hf.top[0], hf.top[1]).color(grip));
add("back-grip", cylinder(120, 14, 12).rotateY(90).translate(-60, hb.top[0], hb.top[1]).color(grip));

return p.model();
