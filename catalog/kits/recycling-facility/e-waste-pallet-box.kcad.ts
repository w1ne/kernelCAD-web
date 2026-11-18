// SPDX-License-Identifier: CC0-1.0
// E-waste pallet box: the big plastic pallet box that waste electrical
// equipment (WEEE) is collected in at a recycling centre.
// What makes it an e-waste box rather than a plastic tub: a ribbed HDPE
// pallet box on three runners with a rolled lip, a drop-down front door
// hanging open on its hinges, the crossed-out wheelie bin WEEE mark on the
// door and side, and a load of old electronics heaped above the rim: a CRT
// monitor, a PC tower on its side, a keyboard, an open laptop, loose
// circuit boards and coiled cables.
// Generic visualization geometry at about real size (1200 x 1000 mm,
// 1000 mm high), millimetres, Z up, door on -Y.

meta({
  name: "e-waste-pallet-box",
  license: 'CC0-1.0',
  title: "E-waste pallet box",
  description: "WEEE e-waste pallet box at about real size: ribbed HDPE box on three runners with a rolled lip, drop-down front door hanging open, crossed-out wheelie bin marks, and a heap of old electronics (CRT monitor, PC tower, keyboard, open laptop, circuit boards, coiled cables). Load choice (heaped, empty). Material controls: box shell, appliance casings and label plates, circuit boards, cables, keys and screens. weeeBlue, councilGreen and weathered presets.",
  tags: ['e-waste', 'WEEE', 'electronics recycling', 'pallet box', 'plastic pallet box', 'collection box', 'recycling', 'materials recovery', 'waste management', 'containers', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const shell = param('shell', '#2f6f9e', { label: 'Box shell (HDPE plastic)' });
const appliances = param('appliances', '#d4cdbb', { label: 'Appliance casings and label plates' });
const boards = param('boards', '#2e7d3a', { label: 'Circuit boards' });
const dark = param('dark', '#24272a', { label: 'Cables, keys and screens (black plastic)' });
const load = param('load', 'heaped', { choices: ['heaped', 'empty'], label: 'Load' });

presets({
  weeeBlue: { shell: '#2f6f9e', appliances: '#d4cdbb', boards: '#2e7d3a', dark: '#24272a' },
  councilGreen: { shell: '#2f7a46', appliances: '#c9c9c4', boards: '#2b6fa0', dark: '#1f2224' },
  weathered: { shell: '#4f6470', appliances: '#b3ab98', boards: '#4a6b3f', dark: '#33363a' },
});

const p = assembly("e-waste-pallet-box");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();

const W = 1200;
const D = 1000;
const RZ = 150;
const H = 1000;
const WALL = 30;
const DOORZ = 600;
const DOORW = 620;

// Runners and the ribbed shell with a notch for the drop-down door.
for (const rx of [-1, 0, 1]) add(`runner-${rx + 1}`, blk(rx * (W / 2 - 70), 0, 0, 140, D - 20, RZ).color(shell));
const notch = blk(0, -D / 2, DOORZ, DOORW, 4 * WALL, H);
add("shell", blk(0, 0, RZ, W, D, H - RZ - 50)
  .subtract(blk(0, 0, RZ + 40, W - 2 * WALL, D - 2 * WALL, H))
  .subtract(notch)
  .color(shell));
add("lip", blk(0, 0, H - 60, W + 40, D + 40, 60)
  .subtract(blk(0, 0, H - 70, W - 2 * WALL, D - 2 * WALL, 100))
  .subtract(notch)
  .color(shell));
for (const rx of [-540, -420, 420, 540]) add(`rib-front-${rx}`, blk(rx, -D / 2 - 10, RZ, 40, 20, H - RZ - 60).color(shell));
for (const ry of [-300, -100, 100, 300]) add(`rib-side-${ry}`, blk(-W / 2 - 10, ry, RZ, 20, 40, H - RZ - 60).color(shell));
add("base-band", blk(0, 0, RZ, W + 30, D + 30, 60).color(shell));

// Drop-down door hanging open from its bottom hinges.
const DY = -D / 2 - 40;
const DH = DOORZ - RZ - 70;
add("door", blk(0, DY, DOORZ - DH, DOORW - 20, 30, DH).color(shell));
for (const z of [DOORZ - DH + 90, DOORZ - DH / 2]) add(`door-rib-${z}`, blk(0, DY - 20, z, DOORW - 80, 12, 30).color(shell));
for (const sx of [-1, 1]) add(`door-hinge-${sx < 0 ? 'l' : 'r'}`, cylinder(90, 18, 10).rotateY(90).translate(sx * (DOORW / 2 - 60) - 45, DY + 10, DOORZ - 10).color(dark));

// WEEE mark: a crossed-out wheelie bin on a light plate (door and -X side).
const markY = (cx: number, y: number, cz: number) => {
  add("door-plate", blk(cx, y, cz - 110, 240, 4, 230).color(appliances));
  add("door-bin", blk(cx, y - 4, cz - 70, 90, 4, 120).color(dark));
  add("door-bin-lid", blk(cx, y - 4, cz + 58, 110, 4, 14).color(dark));
  add("door-bin-wheel", cylinder(4, 14, 10).rotateX(90).translate(cx + 35, y - 4, cz - 80).color(dark));
  add("door-cross-a", box(250, 4, 14, true).rotateY(40).translate(cx, y - 7, cz).color(dark));
  add("door-cross-b", box(250, 4, 14, true).rotateY(-40).translate(cx, y - 7, cz).color(dark));
};
markY(0, DY - 17, DOORZ - DH / 2 - 10);
const SX = -W / 2 - 24;
const SZ = 640;
add("side-plate", blk(SX, 0, SZ - 130, 4, 300, 280).color(appliances));
add("side-bin", blk(SX - 4, 0, SZ - 80, 4, 110, 150).color(dark));
add("side-bin-lid", blk(SX - 4, 0, SZ + 76, 4, 134, 16).color(dark));
add("side-bin-wheel", cylinder(4, 18, 10).rotateY(90).translate(SX - 6, 44, SZ - 92).color(dark));
add("side-cross-a", box(4, 300, 16, true).rotateX(40).translate(SX - 7, 0, SZ).color(dark));
add("side-cross-b", box(4, 300, 16, true).rotateX(-40).translate(SX - 7, 0, SZ).color(dark));

if (load.value === 'heaped') {
  // Bulk of mixed small appliances filling the box up to the door top.
  const TZ = H - 230;
  add("fill", blk(0, 60, RZ + 40, W - 2 * WALL - 10, D - 140, TZ - RZ - 40).color(appliances));
  add("fill-boards", blk(0, -D / 2 + 2 * WALL + 60, DOORZ - 20, DOORW - 60, 60, TZ - DOORZ + 20).color(boards));

  // CRT monitor, screen to the yard, turned a little.
  const crt = (s: Shape) => s.rotateZ(14).translate(-260, -120, TZ);
  add("crt-case", crt(blk(0, 0, 0, 420, 300, 380)).color(appliances));
  add("crt-back", crt(rectPath(160, 140).loft(rectPath(90, 80), { spacing: 260, ruled: true }).rotateX(-90).translate(0, 150, 190)).color(appliances));
  add("crt-bezel", crt(blk(0, -152, 30, 380, 6, 320)).color(dark));
  add("crt-screen", crt(blk(0, -156, 60, 320, 4, 260)).color(boards));

  // PC tower lying on its side, front bays toward -X.
  const pc = (s: Shape) => s.rotateZ(-8).translate(260, 180, TZ);
  add("pc-tower", pc(blk(0, 0, 0, 460, 420, 200)).color(dark));
  add("pc-panel", pc(blk(-232, 0, 30, 6, 360, 140)).color(appliances));
  for (let i = 0; i < 2; i++) add(`pc-bay-${i}`, pc(blk(-236, -90 + i * 160, 110, 4, 130, 30)).color(dark));

  // Keyboard leaning on the monitor, with three key rows.
  const kb = (s: Shape) => s.rotateX(-24).rotateZ(-10).translate(250, -260, TZ + 60);
  add("keyboard", kb(blk(0, 0, 0, 460, 160, 26)).color(appliances));
  for (let r = 0; r < 3; r++) add(`keyboard-keys-${r}`, kb(blk(0, -45 + r * 45, 26, 420, 30, 10)).color(dark));

  // Open laptop on top of the tower.
  const lt = (s: Shape) => s.rotateZ(20).translate(300, 220, TZ + 200);
  add("laptop-base", lt(blk(0, 0, 0, 340, 240, 22)).color(dark));
  add("laptop-lid", lt(box(340, 14, 230, true).translate(0, 0, 115).rotateX(-20).translate(0, 120, 22)).color(dark));
  add("laptop-screen", lt(box(300, 4, 190, true).translate(0, -9, 115).rotateX(-20).translate(0, 120, 22)).color(boards));

  // Loose circuit boards with chips, and coiled cables.
  add("pcb-a", box(300, 220, 6, true).rotateX(30).rotateZ(-30).translate(-80, 280, TZ + 130).color(boards));
  add("pcb-a-chip", box(80, 80, 14, true).translate(0, 0, 8).rotateX(30).rotateZ(-30).translate(-80, 280, TZ + 130).color(dark));
  add("pcb-b", box(260, 180, 6, true).rotateY(-35).translate(-470, 250, TZ + 110).color(boards));
  add("pcb-b-chip", box(70, 60, 14, true).translate(0, 0, 8).rotateY(-35).translate(-470, 250, TZ + 110).color(dark));
  add("cable-coil-a", torus(120, 12).rotateX(70).translate(30, -330, TZ + 120).color(dark));
  add("cable-coil-b", torus(90, 10).rotateY(60).translate(-470, -330, TZ + 90).color(dark));
  add("cable-tail", box(260, 14, 14, true).rotateY(-30).translate(-160, -380, TZ + 40).color(dark));
}

return p.model();
