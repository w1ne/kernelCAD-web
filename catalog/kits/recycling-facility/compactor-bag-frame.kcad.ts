// SPDX-License-Identifier: CC0-1.0
// Compactor bag frame: the bulk-bag filling frame that stands under a
// compactor or screen discharge and holds a one-tonne FIBC open while it
// fills. What makes it that frame rather than a pallet with a post: a
// forkliftable base skid with fork pockets, four corner posts with diagonal
// braces, a top ring frame with a hook on each corner taking the bag's lift
// loops, a round inlet collar with an inflatable spout seal fed by the
// discharge chute above, the woven bag itself on a timber pallet (slack
// when empty, bulging when full), and a weigh indicator on a post because
// the frame sits on load cells.
// Generic visualization geometry at about real size (1.4 m square, 3 m to
// the chute flange), millimetres, Z up, weigh indicator on -Y.

meta({
  name: "compactor-bag-frame",
  license: 'CC0-1.0',
  title: "Compactor bag frame",
  description: "Bulk-bag (FIBC) filling frame at about real size: forkliftable base skid with fork pockets and load cells, four braced corner posts, top frame with loop hooks, inlet collar with inflatable spout seal under a discharge chute, woven bag on a timber pallet (empty or full) and weigh indicator on a post. Material controls: frame paint, bag fabric, pallet timber and hardware. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "bulk bag", "fibc", "big bag", "filling station", "compactor", "load cell", "pallet", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f6fb5', { label: 'Frame (paint)' });
const fabric = param('fabric', '#e9e6dc', { label: 'Bulk bag (woven polypropylene)' });
const timber = param('timber', '#b08a5a', { label: 'Pallet (timber)' });
const hardware = param('hardware', '#c8322a', { label: 'Hooks, seal and indicator (accent)' });
const fill = param('fill', 'full', { choices: ['empty', 'full'], label: 'Bag fill' });

presets({
  plant: { frame: '#2f6fb5', fabric: '#e9e6dc', timber: '#b08a5a', hardware: '#c8322a' },
  weathered: { frame: '#4f6478', fabric: '#cfc8b4', timber: '#8a7458', hardware: '#9a4a3a' },
  stainless: { frame: '#b8bec0', fabric: '#f2f2ee', timber: '#c09a68', hardware: '#2f5d9a' },
  highVisibility: { frame: '#f0c419', fabric: '#f2f2ee', timber: '#b08a5a', hardware: '#2b2f33' },
});

const p = assembly("compactor-bag-frame");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rodX = (x0: number, x1: number, y: number, z: number, r: number, seg = 10) => cylinder(x1 - x0, r, seg).rotateY(90).translate(x0, y, z);
// Square with chamfered corners, as a loft section of the bag.
const sq = (w: number, c: number) => path().moveTo(-w / 2 + c, -w / 2).lineTo(w / 2 - c, -w / 2).lineTo(w / 2, -w / 2 + c)
  .lineTo(w / 2, w / 2 - c).lineTo(w / 2 - c, w / 2).lineTo(-w / 2 + c, w / 2).lineTo(-w / 2, w / 2 - c).lineTo(-w / 2, -w / 2 + c).close();
const bagLoft = (levels: [number, number][]) => sq(levels[0][1], 120).loft(levels.slice(1).map(([, w]) => sq(w, 140)), {
  planes: levels.map(([z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
});

const F = 1400, PZ = 2300, POST = 100;
const sideTag = (v: number) => (v > 0 ? 'b' : 'f');

// Base skid with fork pockets and load cells at the corners.
for (const y of [-F / 2 + 60, F / 2 - 60]) add(`skid-rail-${sideTag(y)}`, blk(0, y, 0, F + 100, 120, 120).color(frame));
for (const x of [-350, 350]) {
  add(`fork-pocket-${x > 0 ? 'r' : 'l'}`, blk(x, 0, 120, 260, F, 110).subtract(blk(x, 0, 135, 220, F + 20, 80)).color(frame));
}
add("base-deck", blk(0, 0, 230, F, F, 20).color(frame));
for (const x of [-F / 2 + 60, F / 2 - 60]) for (const y of [-F / 2 + 60, F / 2 - 60]) {
  add(`load-cell-${x > 0 ? 'r' : 'l'}-${sideTag(y)}`, blk(x, y, 250, 160, 120, 60).color('#9aa1a4'));
}

// Corner posts, diagonal braces on the back and sides, top frame.
for (const x of [-F / 2 + 60, F / 2 - 60]) for (const y of [-F / 2 + 60, F / 2 - 60]) {
  add(`post-${x > 0 ? 'r' : 'l'}-${sideTag(y)}`, blk(x, y, 310, POST, POST, PZ - 310).color(frame));
}
const dz = 1500, dx = F - 120, ang = (Math.atan2(dz, dx) * 180) / Math.PI, len = Math.hypot(dx, dz);
add("brace-back", box(len, 50, 50, true).rotateY(-ang).translate(0, F / 2 - 60, 310 + 200 + dz / 2).color(frame));
for (const x of [-F / 2 + 60, F / 2 - 60]) add(`brace-${x > 0 ? 'r' : 'l'}`, box(50, len, 50, true).rotateX(ang).translate(x, 0, 310 + 200 + dz / 2).color(frame));
for (const y of [-F / 2 + 60, F / 2 - 60]) add(`top-rail-${sideTag(y)}`, blk(0, y, PZ, F, POST, POST).color(frame));
for (const x of [-F / 2 + 60, F / 2 - 60]) add(`top-rail-${x > 0 ? 'r' : 'l'}`, blk(x, 0, PZ, POST, F, POST).color(frame));
add("collar-beam", blk(0, 0, PZ + 20, F - 120, 160, 60).color(frame));

// Inlet collar with inflatable seal under a square discharge chute.
add("inlet-collar", cylinder(500, 200, 16).translate(0, 0, PZ - 380).color('#b8bec0'));
add("spout-seal", torus(205, 45, 16).translate(0, 0, PZ - 300).color(hardware));
add("chute-transition", sq(420, 40).loft([sq(700, 40)], {
  planes: [PZ + 80, PZ + 600].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })), ruled: true,
}).color(frame));
add("chute-flange", blk(0, 0, PZ + 600, 820, 820, 40).color(frame));
add("chute-stub", blk(0, 0, PZ + 640, 700, 700, 260).color('#9aa1a4'));

// Loop hooks on the corners of the top frame.
for (const x of [-F / 2 + 220, F / 2 - 220]) for (const y of [-F / 2 + 220, F / 2 - 220]) {
  add(`hook-${x > 0 ? 'r' : 'l'}-${sideTag(y)}`, torus(55, 14, 10).rotateX(90).translate(x, y, PZ - 70).color(hardware));
  add(`hook-arm-${x > 0 ? 'r' : 'l'}-${sideTag(y)}`, blk((x + Math.sign(x) * (F / 2 - 60)) / 2, y, PZ - 20, F / 2 - 280 + 60, 40, 40).color(hardware));
}

// Timber pallet with the bag standing on it.
const PAL = 1200, BZ = 450;
for (const x of [-500, 0, 500]) add(`pallet-bearer-${x + 600}`, blk(x, 0, 310, 100, PAL, 100).color(timber));
for (let k = 0; k < 6; k++) add(`pallet-board-${k}`, blk(0, -PAL / 2 + 100 + k * 200, 410, PAL, 140, 22).color(timber));

const full = fill.value === 'full';
const levels: [number, number][] = full
  ? [[BZ - 18, 1000], [BZ + 250, 1120], [BZ + 900, 1170], [BZ + 1350, 1100], [BZ + 1480, 700]]
  : [[BZ - 18, 940], [BZ + 300, 980], [BZ + 650, 900], [BZ + 1050, 960], [BZ + 1480, 700]];
add("bulk-bag", bagLoft(levels).color(fabric));
add("bag-spout", cylinder(PZ - 380 - (BZ + 1480) + 20, 190, 14).translate(0, 0, BZ + 1470).color(fabric));
for (const y of [-1, 1]) add(`bag-label-${y > 0 ? 'b' : 'f'}`, blk(0, y * (full ? 588 : 498), BZ + 500, 360, 6, 460).color('#f7f7f2'));
add("bag-label-print", blk(0, -(full ? 595 : 505), BZ + 760, 260, 6, 60).color('#2f5d9a'));
for (const x of [-1, 1]) for (const y of [-1, 1]) {
  const bx = x * 420, by = y * 420, hx = x * (F / 2 - 220), hy = y * (F / 2 - 220);
  const dzL = PZ - 70 - (BZ + 1380);
  const tilt = (Math.atan2(Math.hypot(hx - bx, hy - by), dzL) * 180) / Math.PI;
  add(`lift-loop-${x > 0 ? 'r' : 'l'}-${sideTag(y)}`, box(70, 12, Math.hypot(dzL, Math.hypot(hx - bx, hy - by)), true)
    .rotateX(-tilt).rotateZ((Math.atan2(hy - by, hx - bx) * 180) / Math.PI - 90)
    .translate((bx + hx) / 2, (by + hy) / 2, (BZ + 1380 + PZ - 70) / 2).color(fabric));
}
// Seam stitching bands on the bag sides.
for (const zz of [BZ + 400, BZ + 1000]) add(`seam-${zz}`, sq(full ? 1180 : 960, 140).extrude(14).translate(0, 0, zz).color('#cfc8b4'));

// Weigh indicator on a post in front.
add("indicator-post", blk(-F / 2 - 300, -F / 2 - 200, 0, 70, 70, 1450).color(frame));
add("indicator-foot", blk(-F / 2 - 300, -F / 2 - 200, 0, 300, 300, 15).color(frame));
add("indicator-head", blk(-F / 2 - 300, -F / 2 - 230, 1350, 360, 140, 250).color('#d8dad6'));
add("indicator-display", blk(-F / 2 - 300, -F / 2 - 305, 1440, 260, 10, 90).color('#1f3a2a'));
add("indicator-buttons", blk(-F / 2 - 300, -F / 2 - 305, 1380, 220, 10, 30).color(hardware));
add("load-cable", rodX(-F / 2 - 300, -F / 2 + 60, -F / 2 - 200, 290, 12, 6).color('#2a2c2e'));

return p.model();
