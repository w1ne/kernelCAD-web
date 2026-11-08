// SPDX-License-Identifier: CC0-1.0
// Shopping basket: the tall rolling basket supermarkets offer next to the
// hand baskets. What makes it a rolling basket rather than a crate: a deep
// tapered tub with a grid of mesh windows, two wheels in housings at the
// back foot, front skid feet so it stands level, and a telescopic pull
// handle running up the back with a looped grip, extended or stowed.
// Generic visualization geometry at about real size (540 x 360 mm rim,
// 400 mm tub), millimetres, Z up, front toward -Y, wheels at +Y, base on z = 0.

meta({
  name: "shopping-basket",
  license: 'CC0-1.0',
  title: "Rolling shopping basket",
  description: "Tall rolling supermarket basket at about real size: deep tapered tub with a grid of mesh windows, rolled rim with a front logo band, two wheels in housings at the back foot, front skid feet, and a telescopic pull handle up the back with a looped grip, extended or stowed. Material controls: basket plastic, handle metal, wheels, accent band. lagoonBlue, berryRed and slateGrey presets; handle pose choice.",
  tags: ['shopping basket', 'rolling basket', 'trolley basket', 'wheeled basket', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 3500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const plastic = param('plastic', '#2f7fb8', { label: 'Basket plastic' });
const metal = param('metal', '#c9ced2', { label: 'Pull handle' });
const wheels = param('wheels', '#1d1f21', { label: 'Wheels' });
const accent = param('accent', '#f2c230', { label: 'Accent band and grip' });
const pull = param('pull', 'extended', { choices: ['extended', 'stowed'], label: 'Handle pose' });

presets({
  lagoonBlue: { plastic: '#2f7fb8', metal: '#c9ced2', wheels: '#1d1f21', accent: '#f2c230' },
  berryRed: { plastic: '#b52a3a', metal: '#d0d4d8', wheels: '#262829', accent: '#f4f1e8' },
  slateGrey: { plastic: '#4a5056', metal: '#9aa3a8', wheels: '#1a1b1c', accent: '#7fbf3f' },
});

const p = assembly("shopping-basket");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();

// Deep tub raised on its feet.
const Z0 = 40;
const H = 400;
const outer = rectPath(235, 150).loft(rectPath(265, 175), { spacing: H, ruled: true }).translate(0, 0, Z0);
const inner = rectPath(226, 141).loft(rectPath(258, 168), { spacing: H, ruled: true }).translate(0, 0, Z0 + 12);
let tub = outer.subtract(inner);
// Mesh windows: a 4-row grid on the long walls, 3 columns on the ends.
for (let row = 0; row < 4; row++) {
  const z = Z0 + 50 + row * 75;
  for (let k = -3; k <= 3; k++) tub = tub.subtract(blk(k * 62, 0, z, 44, 420, 52));
  for (let k = -1; k <= 1; k++) tub = tub.subtract(blk(0, k * 82, z, 600, 60, 52));
}
add("tub", tub.color(plastic));
add("rim", blk(0, 0, Z0 + H - 8, 544, 364, 26).subtract(blk(0, 0, Z0 + H - 12, 508, 328, 40)).color(plastic));
add("logo-band", blk(0, -183, Z0 + H - 4, 260, 4, 18).color(accent));

// Base frame, front skid feet, rear wheels in housings.
add("base-frame", blk(0, 0, 20, 470, 300, 22).color(plastic));
for (const s of [-1, 1]) add(`skid-${s < 0 ? 'l' : 'r'}`, blk(s * 200, -110, 0, 50, 70, 22).color(wheels));
const WR = 48;
for (const s of [-1, 1]) {
  const tag = s < 0 ? 'l' : 'r';
  add(`wheel-housing-${tag}`, blk(s * 228, 150, 30, 46, 110, 90).color(plastic));
  const tyre = cylinder(34, WR, 16).rotateY(90).translate(s * 251 - 17, 165, WR - 2);
  add(`wheel-${tag}`, tyre.subtract(blk(s * 251, 165, -20, 60, 120, 20)).color(wheels));
  add(`hub-${tag}`, cylinder(6, 20, 12).rotateY(90).translate(s * 268 + (s < 0 ? -6 : 0), 165, WR - 2).color(accent));
}

// Telescopic pull handle up the back: outer sleeves on the tub, inner tubes
// slide up to a looped grip.
const ext = pull.value === 'extended' ? 380 : 0;
for (const s of [-1, 1]) {
  const tag = s < 0 ? 'l' : 'r';
  add(`sleeve-${tag}`, cylinder(380, 13, 10).translate(s * 150, 182, Z0 + 30).color(metal));
  add(`sleeve-clip-lo-${tag}`, blk(s * 150, 172, Z0 + 60, 40, 20, 24).color(plastic));
  add(`sleeve-clip-hi-${tag}`, blk(s * 150, 180, Z0 + 330, 40, 20, 24).color(plastic));
  add(`slider-${tag}`, cylinder(140 + ext, 10, 10).translate(s * 150, 182, Z0 + 380).color(metal));
}
const GZ = Z0 + 520 + ext;
add("grip-loop", torus(150, 12, 24).rotateX(90).translate(0, 182, GZ - 150).subtract(blk(0, 182, GZ - 320, 360, 40, 170)).color(metal));
add("grip", cylinder(160, 18, 12).rotateY(90).translate(-80, 182, GZ).color(accent));

return p.model();
