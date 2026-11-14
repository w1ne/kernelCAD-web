// SPDX-License-Identifier: CC0-1.0
// Roll cage trolley: the wire cage that brings stock off the delivery lorry
// and onto the shop floor. What makes it a roll cage rather than a shelf: a
// low deck on four swivel castors, three tall mesh walls (two sides and the
// back) made of tube frames filled with welded wire, an optional fold-down
// mid shelf, and coloured retaining straps across the open front.
// Generic visualization geometry at about real size (800 x 700 mm deck,
// 1.7 m tall), millimetres, Z up, open front toward -Y, castors on z = 0.

meta({
  name: "roll-cage-trolley",
  license: 'CC0-1.0',
  title: "Roll cage trolley",
  description: "Four-castor roll cage at about real size: low deck on swivel castors, three tall mesh walls (two sides and the back) of tube frames filled with welded wire, optional fold-down mid shelf and coloured retaining straps across the open front. Material controls: wire mesh, deck, castors, straps. galvanized, warehouseBlue and chilledGreen presets; shelf choice.",
  tags: ['roll cage', 'cage trolley', 'roll container', 'stock cage', 'delivery cage', 'retail', 'grocery', 'shop', 'logistics', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'warehouse', 'scene'],
  triangleBudget: 2500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const mesh = param('mesh', '#aeb6ba', { label: 'Wire mesh' });
const deck = param('deck', '#2f5fa8', { label: 'Deck' });
const castors = param('castors', '#2b2e31', { label: 'Castors' });
const straps = param('straps', '#f2a63a', { label: 'Retaining straps' });
const shelf = param('shelf', 'shelf', { choices: ['shelf', 'none'], label: 'Mid shelf' });

presets({
  galvanized: { mesh: '#aeb6ba', deck: '#2f5fa8', castors: '#2b2e31', straps: '#f2a63a' },
  warehouseBlue: { mesh: '#3f6fb4', deck: '#2b2e31', castors: '#1d1f21', straps: '#f2c230' },
  chilledGreen: { mesh: '#c9ced2', deck: '#3f8f4a', castors: '#262829', straps: '#c8302c' },
});

const p = assembly("roll-cage-trolley");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const W = 800;
const D = 700;
const DZ = 150;
const TOP = 1700;

// Swivel castors under the deck corners.
const WR = 52;
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const tag = `${sx < 0 ? 'l' : 'r'}${sy < 0 ? 'f' : 'b'}`;
  const x = sx * (W / 2 - 70);
  const y = sy * (D / 2 - 70);
  add(`castor-plate-${tag}`, blk(x, y, DZ - 30, 90, 90, 8).color(mesh));
  add(`castor-swivel-${tag}`, cylinder(14, 22, 12).translate(x, y, DZ - 44).color(mesh));
  add(`castor-fork-l-${tag}`, blk(x - 24, y + 12, WR - 4, 6, 70, DZ - 40 - WR + 4).color(mesh));
  add(`castor-fork-r-${tag}`, blk(x + 24, y + 12, WR - 4, 6, 70, DZ - 40 - WR + 4).color(mesh));
  const wheel = cylinder(34, WR, 16).rotateY(90).translate(x - 17, y + 12, WR - 2);
  add(`castor-wheel-${tag}`, wheel.subtract(blk(x, y + 12, -20, 60, 140, 20)).color(castors));
}

// Deck: a moulded tray with a raised lip on a steel channel frame.
add("deck-frame", blk(0, 0, DZ - 22, W, D, 22).color(mesh));
add("deck", blk(0, 0, DZ, W - 20, D - 20, 30).color(deck));
add("deck-lip", blk(0, 0, DZ + 30, W - 20, D - 20, 14).subtract(blk(0, 0, DZ + 28, W - 70, D - 70, 30)).color(deck));
for (let k = -2; k <= 2; k++) add(`deck-rib-${k + 2}`, blk(k * 140, 0, DZ + 30, 20, D - 80, 6).color(deck));

// A mesh wall: tube perimeter plus a welded wire grid. Built in the XZ plane
// across `len`, then turned and placed.
const wall = (len: number, cols: number, rows: number) => {
  const parts = [];
  const z0 = DZ + 44;
  const h = TOP - z0;
  parts.push(blk(-len / 2 + 12, 0, z0, 24, 24, h));
  parts.push(blk(len / 2 - 12, 0, z0, 24, 24, h));
  parts.push(blk(0, 0, TOP - 24, len, 24, 24));
  parts.push(blk(0, 0, z0, len, 24, 24));
  for (let c = 1; c < cols; c++) parts.push(blk(-len / 2 + (c * len) / cols, 0, z0, 6, 6, h));
  for (let r = 1; r < rows; r++) parts.push(blk(0, 0, z0 + (r * h) / rows, len - 24, 6, 6));
  return parts;
};
wall(D - 20, 7, 10).forEach((s, i) => {
  add(`side-l-${i}`, s.rotateZ(90).translate(-W / 2 + 12, 0, 0).color(mesh));
  add(`side-r-${i}`, s.rotateZ(90).translate(W / 2 - 12, 0, 0).color(mesh));
});
wall(W - 48, 8, 10).forEach((s, i) => add(`back-${i}`, s.translate(0, D / 2 - 12, 0).color(mesh)));
// Hinge lugs where the walls meet the deck.
for (const sy of [-1, 1]) {
  for (const sx of [-1, 1]) add(`hinge-${sx < 0 ? 'l' : 'r'}${sy < 0 ? 'f' : 'b'}`, cylinder(40, 16, 10).translate(sx * (W / 2 - 12), sy * (D / 2 - 60), DZ + 30).color(mesh));
}

// Optional fold-down mid shelf: a wire tray resting on side brackets.
if (shelf.value === 'shelf') {
  const SZ = 900;
  add("shelf-frame", blk(0, 0, SZ, W - 60, D - 40, 24).subtract(blk(0, 0, SZ - 2, W - 100, D - 80, 30)).color(deck));
  for (let k = 1; k < 8; k++) add(`shelf-wire-${k}`, blk(-(W - 80) / 2 + (k * (W - 80)) / 8, 0, SZ + 10, 6, D - 60, 6).color(mesh));
  for (const s of [-1, 1]) add(`shelf-bracket-${s < 0 ? 'l' : 'r'}`, blk(s * (W / 2 - 34), 0, SZ - 30, 20, D - 80, 30).color(mesh));
}

// Retaining straps across the open front, buckled to the side frames.
for (const z of [620, 1300]) {
  add(`strap-${z}`, blk(0, -D / 2 + 4, z, W - 30, 6, 50).color(straps));
  for (const s of [-1, 1]) add(`strap-buckle-${z}-${s < 0 ? 'l' : 'r'}`, blk(s * (W / 2 - 20), -D / 2 + 2, z - 8, 30, 14, 66).color(castors));
}

return p.model();
