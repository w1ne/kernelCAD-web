// SPDX-License-Identifier: CC0-1.0
// Wire-mesh recycling cage: the see-through bottle and can bank at a public
// drop-off point. What makes it that cage rather than a crate: welded square
// mesh on all four walls so you can see how full it is, box-section corner
// posts standing on feet, a sloped roof with two round posting holes, a
// half-width hinged front door with a padlocked hasp for emptying, an icon
// sign board across the front, and the collected bottles heaped inside.
// Generic visualization geometry at about real size (1.7 x 1.0 m, 1.75 m
// tall), millimetres, Z up, door and sign on -Y.

meta({
  name: "wire-mesh-recycling-cage",
  license: 'CC0-1.0',
  title: "Wire-mesh recycling cage",
  description: "Public drop-off mesh cage at about real size: welded square mesh on all four walls, box-section corner posts on feet, sloped roof with two posting holes, half-width hinged front door with padlocked hasp, icon sign board, and collected bottles heaped inside. Half or full fill. Material controls: frame, mesh, roof and contents. bottles, cans and textiles presets.",
  tags: ["recycling", "mesh cage", "bottle bank", "can bank", "drop-off", "wire mesh", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3f6e3a', { label: 'Frame and posts (powder coat)' });
const mesh = param('mesh', '#b9bec0', { label: 'Welded mesh (galvanised)' });
const roof = param('roof', '#2f5a30', { label: 'Roof and sign board (sheet)' });
const contents = param('contents', '#8fc0d8', { label: 'Collected material' });
const fill = param('fill', 'full', { choices: ['half', 'full'], label: 'Fill level' });

presets({
  bottles: { frame: '#3f6e3a', mesh: '#b9bec0', roof: '#2f5a30', contents: '#8fc0d8' },
  cans: { frame: '#2f5f8a', mesh: '#b9bec0', roof: '#244a6c', contents: '#c4c7ca' },
  textiles: { frame: '#7a3f6e', mesh: '#a9aeb0', roof: '#5e2f55', contents: '#c48a6a' },
});

const p = assembly("wire-mesh-recycling-cage");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const HW = 800, HD = 450; // post centres
const ZF = 170; // floor
const ZW = 1500; // top of walls
const PITCH = 80;

// Corner posts on feet, floor tray and top/bottom rails.
for (const [s, sx, sy] of [['fl', -1, -1], ['fr', 1, -1], ['bl', -1, 1], ['br', 1, 1]] as const) {
  add(`post-${s}`, blk(sx * HW, sy * HD, 0, 60, 60, ZW + 40).color(frame));
  add(`foot-${s}`, blk(sx * HW, sy * HD, 0, 140, 140, 12).color(frame));
}
add("floor-tray", blk(0, 0, ZF - 30, 2 * HW, 2 * HD, 30).color(frame));
for (const [s, z] of [['bottom', ZF - 50], ['top', ZW - 40]] as const) {
  add(`rail-${s}-f`, blk(0, -HD, z, 2 * HW, 50, 50).color(frame));
  add(`rail-${s}-b`, blk(0, HD, z, 2 * HW, 50, 50).color(frame));
  add(`rail-${s}-l`, blk(-HW, 0, z, 50, 2 * HD, 50).color(frame));
  add(`rail-${s}-r`, blk(HW, 0, z, 50, 2 * HD, 50).color(frame));
}

// Welded square mesh on all four walls.
const WH = ZW - 40 - ZF;
for (const [s, sy] of [['f', -1], ['b', 1]] as const) {
  for (let k = 0; k < Math.floor((2 * HW) / PITCH) - 1; k++) add(`mesh-${s}-v${k}`, blk(-HW + PITCH * (k + 1), sy * HD, ZF, 6, 6, WH).color(mesh));
  for (let j = 0; j < Math.floor(WH / PITCH); j++) add(`mesh-${s}-h${j}`, blk(0, sy * HD, ZF + PITCH * (j + 1) - 3, 2 * HW, 6, 6).color(mesh));
}
for (const [s, sx] of [['l', -1], ['r', 1]] as const) {
  for (let k = 0; k < Math.floor((2 * HD) / PITCH) - 1; k++) add(`mesh-${s}-v${k}`, blk(sx * HW, -HD + PITCH * (k + 1), ZF, 6, 6, WH).color(mesh));
  for (let j = 0; j < Math.floor(WH / PITCH); j++) add(`mesh-${s}-h${j}`, blk(sx * HW, 0, ZF + PITCH * (j + 1) - 3, 6, 2 * HD, 6).color(mesh));
}

// Half-width front door: frame, hinges, hasp and padlock.
const DX0 = -HW + 40, DX1 = -20;
add("door-stile-hinge", blk(DX0 + 20, -HD - 30, ZF, 40, 30, WH).color(frame));
add("door-stile-lock", blk(DX1 - 20, -HD - 30, ZF, 40, 30, WH).color(frame));
add("door-rail-bottom", blk((DX0 + DX1) / 2, -HD - 30, ZF, DX1 - DX0, 30, 40).color(frame));
add("door-rail-top", blk((DX0 + DX1) / 2, -HD - 30, ZW - 80, DX1 - DX0, 30, 40).color(frame));
add("door-rail-mid", blk((DX0 + DX1) / 2, -HD - 30, ZF + WH / 2, DX1 - DX0, 30, 30).color(frame));
for (const z of [ZF + 120, ZW - 300]) add(`door-hinge-${z}`, cylinder(120, 22, 8).translate(DX0 - 10, -HD - 40, z).color(mesh));
add("hasp-plate", blk(DX1 + 20, -HD - 50, ZF + WH / 2 - 60, 120, 12, 120).color(mesh));
add("padlock-body", blk(DX1 + 40, -HD - 75, ZF + WH / 2 - 140, 70, 30, 80).color('#c9a63a'));
add("padlock-shackle", torus(26, 6, 10).rotateY(90).translate(DX1 + 40, -HD - 75, ZF + WH / 2 - 55).color('#c9ccce'));

// Sloped roof with two posting holes, rising toward the back.
const RZF = ZW + 40, RZB = ZW + 220;
const roofSlab = profileYZ([[-HD - 80, RZF], [HD + 80, RZB], [HD + 80, RZB + 40], [-HD - 80, RZF + 40]], 2 * HW + 160);
const holes: number[] = [-420, 420];
add("roof", holes.reduce((s, x) => s.subtract(cylinder(500, 110, 16).translate(x, -60, ZW - 100)), roofSlab).color(roof));
for (const x of holes) {
  const zTop = RZF + 40 + ((-60 + HD + 80) / (2 * HD + 160)) * (RZB - RZF);
  add(`hole-collar-${x < 0 ? 'l' : 'r'}`, cylinder(50, 128, 16).subtract(cylinder(80, 110, 16).translate(0, 0, -10)).translate(x, -60, zTop - 30).color('#1c1d1e'));
}
add("roof-front-lip", blk(0, -HD - 80, RZF - 60, 2 * HW + 160, 20, 100).color(roof));

// Icon sign board across the top of the front, right half (beside the door).
add("sign-board", blk(HW / 2 + 10, -HD - 40, ZW - 380, HW - 100, 16, 300).color(roof));
add("sign-panel", blk(HW / 2 + 10, -HD - 50, ZW - 360, HW - 160, 8, 260).color('#f2f0e6'));
const bottleIcon: [number, number][] = [[-45, 0], [45, 0], [45, 130], [20, 165], [20, 200], [-20, 200], [-20, 165], [-45, 130]];
for (const [k, x] of [180, 330, 480, 630].entries()) add(`sign-icon-${k}`, profileXZ(bottleIcon, 6).translate(x, -HD - 56, ZW - 330).color(k % 2 ? '#2f68b0' : frame));
add("sign-arrow", profileXZ([[0, 0], [70, 40], [0, 80]], 6).translate(HW / 2 - 330, -HD - 56, ZW - 310).color('#c8322a'));

// Collected bottles heaped inside.
const HZ = fill.value === 'full' ? 950 : 520;
add("contents-heap", sphere(1000).scale([0.74, 0.4, HZ / 1000]).translate(0, 0, ZF).subtract(blk(0, 0, ZF - 1100, 2000, 2000, 1100)).color(contents));
const zAt = (x: number, y: number) => ZF + HZ * Math.sqrt(Math.max(0, 1 - (x / 740) ** 2 - (y / 400) ** 2));
const bottles: [number, number, number][] = [[-480, -260, 20], [-220, -330, 140], [80, -300, 70], [380, -250, -30], [-560, 80, 100], [-120, 0, 30], [250, 60, 160], [560, -60, 60]];
bottles.forEach(([x, y, a], k) => {
  const z = zAt(x, y) + 20;
  const lay = (s: Shape) => s.rotateZ(a).translate(x, y, z);
  add(`bottle-${k}`, lay(cylinder(220, 40, 8).rotateY(90).translate(-140, 0, 0)).color(k % 3 === 1 ? '#5aa04a' : contents));
  add(`bottle-neck-${k}`, lay(cylinder(60, 15, 6).rotateY(90).translate(80, 0, 0)).color(k % 3 === 1 ? '#5aa04a' : contents));
  add(`bottle-cap-${k}`, lay(cylinder(16, 18, 6).rotateY(90).translate(140, 0, 0)).color(k % 2 ? '#c8322a' : '#2f68b0'));
});

return p.model();
