// SPDX-License-Identifier: CC0-1.0
// Chest freezer: the glass-lidded ice-cream freezer that stands by the
// tills. What makes it a chest freezer rather than a cabinet: a deep
// insulated tub with rounded corners and a moulded bumper round the rim,
// two curved sliding glass lids on rails (one slid over the other so the
// stocked well shows), ice-cream tubs and boxed lollies inside, a brand
// panel on the front, a louvred compressor grille low on one end, and a
// thermometer display. Generic visualization geometry at about real size
// (1.5 m long, 880 mm to the lid), millimetres, Z up, front on -Y.

meta({
  name: "chest-freezer",
  license: 'CC0-1.0',
  title: "Chest freezer",
  description: "Glass-lid ice-cream chest freezer at about real size: rounded insulated tub with moulded rim bumper, two curved sliding glass lids on rails, stocked well with ice-cream tubs and lolly boxes, front brand panel with a cone logo, louvred compressor grille, thermometer display and levelling feet. Material controls: cabinet, glass lids, rim bumper, brand panel. iceCreamPink, frozenBlue and plainWhite presets; lid choice.",
  tags: ['chest freezer', 'ice cream freezer', 'freezer', 'refrigeration', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#f1f3f2', { label: 'Cabinet enamel' });
const lids = param('lids', '#9fc9d6', { label: 'Glass lids' });
const bumper = param('bumper', '#7a8287', { label: 'Rim bumper and rails' });
const brand = param('brand', '#e2508a', { label: 'Brand panel' });
const lid = param('lid', 'open', { choices: ['open', 'closed'], label: 'Lids' });

presets({
  iceCreamPink: { cabinet: '#f1f3f2', lids: '#9fc9d6', bumper: '#7a8287', brand: '#e2508a' },
  frozenBlue: { cabinet: '#e6edf2', lids: '#a8d4e2', bumper: '#2f5fa8', brand: '#3d8fd6' },
  plainWhite: { cabinet: '#fafafa', lids: '#c4dce2', bumper: '#b8bfc3', brand: '#d7dcdd' },
});

const p = assembly("chest-freezer");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// Rounded-rectangle plan outline, corners of radius r.
const rrect = (w: number, d: number, r: number) => {
  const pts = [];
  const c = [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, 90], [-w / 2 + r, -d / 2 + r, 180], [w / 2 - r, -d / 2 + r, 270]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= 4; i++) {
    const a = ((a0 + i * 22.5) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
};

const L = 1500;
const D = 700;
const H = 820;
const T = 80;

// Feet, tub with the well cut out, rim bumper.
for (const [x, y, tag] of [[-660, -280, 'fl'], [660, -280, 'fr'], [-660, 280, 'bl'], [660, 280, 'br']]) add(`foot-${tag}`, cylinder(40, 30, 10).translate(x, y, 0).color(bumper));
add("tub", extrudePolygon(rrect(L, D, 90), H - 40).translate(0, 0, 40)
  .subtract(extrudePolygon(rrect(L - 2 * T, D - 2 * T, 40), 600).translate(0, 0, H - 560))
  .subtract(blk(-L / 2, -100, 90, 30, 300, 14))
  .subtract(blk(-L / 2, -100, 130, 30, 300, 14))
  .subtract(blk(-L / 2, -100, 170, 30, 300, 14))
  .subtract(blk(-L / 2, -100, 210, 30, 300, 14))
  .color(cabinet));
add("well-liner", extrudePolygon(rrect(L - 2 * T, D - 2 * T, 40), 10).translate(0, 0, H - 560).color('#dfe6ea'));
add("rim-bumper", extrudePolygon(rrect(L + 16, D + 16, 98), 40).translate(0, 0, H).subtract(extrudePolygon(rrect(L - 2 * T, D - 2 * T, 40), 60).translate(0, 0, H - 10)).color(bumper));
add("base-band", extrudePolygon(rrect(L + 6, D + 6, 93), 60).translate(0, 0, 40).color(bumper));

// Front brand panel with an ice-cream cone logo.
add("brand-panel", blk(-120, -D / 2 - 4, 260, 900, 8, 400).color(brand));
add("cone-logo", profileXZ([[-60, 0], [60, 0], [0, -170]], 6).translate(-420, -D / 2 - 10, 600).color('#d9a35a'));
add("scoop-logo", extrudePolygon(circle(70, 18), 6).rotateX(90).translate(-420, -D / 2 - 7, 640).color('#fbe9ef'));
add("brand-stripe", blk(130, -D / 2 - 9, 420, 500, 4, 60).color('#ffffff'));
add("brand-stripe-low", blk(130, -D / 2 - 9, 320, 360, 4, 40).color('#ffffff'));

// Thermometer display on the right of the front.
add("thermo-box", blk(560, -D / 2 - 10, 620, 160, 20, 90).color('#2b2f32'));
add("thermo-digits", blk(540, -D / 2 - 21, 640, 90, 3, 50).color('#e2423a'));

// Stock in the well: tubs and lolly boxes, tops just below the rim.
const tubColours = ['#f4e3c1', '#7a4a2e', '#f1a7c2', '#c7e3a4', '#f4e3c1', '#a8d8ea', '#7a4a2e', '#f1a7c2'];
let k = 0;
for (const x of [-560, -420, -280]) for (const y of [-160, 0, 160]) {
  if (k >= 8) break;
  add(`tub-${k}`, cylinder(230, 62, 14).translate(x, y, H - 300).color('#f7f4ec'));
  add(`tub-lid-${k}`, cylinder(10, 65, 14).translate(x, y, H - 70).color(tubColours[k]));
  k++;
}
for (let i = 0; i < 5; i++) add(`lolly-box-${i}`, blk(-130 + i * 75, -100, H - 300, 70, 260, 210 + (i % 2) * 20).color(['#3d8fd6', '#e2423a', '#f2c230', '#3d8fd6', '#5cb85c'][i]));
for (let i = 0; i < 4; i++) add(`cone-box-${i}`, blk(290 + i * 110, 60, H - 300, 100, 300, 180).color(['#f2c230', '#e2508a', '#f2c230', '#e2508a'][i]));

// Curved sliding glass lids on two rails: a shallow arched shell spanning Y.
const arch = (inner: number) => {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push([-D / 2 + 20 + t * (D - 40), 40 * Math.sin(Math.PI * t) + inner]);
  }
  return pts;
};
const shell = [...arch(0), ...arch(8).reverse()];
const LW = L / 2 - 40;
const lidA = lid.value === 'open' ? 320 : -L / 4 + 10;
add("lid-rear", profileYZ(shell, LW).translate(L / 4 - 10, 0, H + 40).color(lids));
add("lid-front", profileYZ(shell.map(([y, z]) => [y, z + 14]), LW).translate(lidA, 0, H + 40).color(lids));
add("lid-front-handle", blk(lidA - LW / 2 + 20, 0, H + 40, 30, D - 120, 66).color(bumper));
add("lid-rear-handle", blk(L / 4 - 10 - LW / 2 + 20, 0, H + 40, 30, D - 120, 54).color(bumper));

return p.model();
