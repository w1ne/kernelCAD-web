// SPDX-License-Identifier: CC0-1.0
// Glass screening deck: the double-deck sizing screen in a glass recovery
// plant that splits crushed cullet into furnace-ready size bands. Two
// stacked decks of polyurethane screen panels sit inside an open steel
// box; a pair of unbalanced motors on raked brackets drives it in a
// straight line, so the glass walks along both decks. Coarse pieces run
// off the top deck, the middle band off the lower deck, and the fines
// drop through both into a pan underneath, each down its own chute into
// its own bin. What makes it a sizing screen rather than a table: the two
// visible decks at different heights, the raked twin motors, the rubber
// buffer mounts and the three stepped outlets each feeding a bin of a
// different grade of glass.
// Generic visualization geometry at about real size (6.4 m long, 3.6 m
// wide, 2.6 m high), millimetres, Z up, outlets toward -X.

meta({
  name: "glass-screening-deck",
  license: 'CC0-1.0',
  title: "Glass screening deck",
  description: "Double-deck cullet sizing screen at about real size: open steel screen box with an upper deck of coarse polyurethane panels and a lower deck of fine panels, twin unbalanced motors on raked side brackets, four rubber buffer mounts on a leg frame, feed chute at the rear, and three stepped outlets (coarse, middle, fines) each dropping into its own bin of cullet. Material controls: frame paint, screen panels, cullet glass, bins. plant, flintLine, weathered and highVisibility presets.",
  tags: ["recycling", "glass recycling", "cullet", "screening deck", "double-deck screen", "sizing screen", "vibrating screen", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#5a6b7a', { label: 'Frame and screen box (paint)' });
const panels = param('panels', '#d4572e', { label: 'Polyurethane screen panels' });
const cullet = param('cullet', '#3f8a52', { label: 'Cullet (crushed glass)' });
const bins = param('bins', '#2f6f9e', { label: 'Collection bins' });

presets({
  plant: { frame: '#5a6b7a', panels: '#d4572e', cullet: '#3f8a52', bins: '#2f6f9e' },
  flintLine: { frame: '#e1ddd0', panels: '#3b8fc4', cullet: '#cfe3df', bins: '#556270' },
  weathered: { frame: '#6d6a62', panels: '#9a5a3c', cullet: '#5d7a5c', bins: '#4d5a63' },
  highVisibility: { frame: '#e8c12c', panels: '#2f8f4e', cullet: '#a8662a', bins: '#d6402e' },
});

const p = assembly("glass-screening-deck");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const dark = '#26292c';
const amber = '#b8742a', flint = '#d8e6e2';

// Screen box: x from XA (outlet) to XB (feed), interior width W.
const XA = -1700, XB = 2000, W = 1600, ZU = 1650, ZL = 1300, ZP = 1000, ZTOP = 1900;
for (const sd of [-1, 1]) {
  const y = sd * (W / 2 + 15);
  add(`side-plate-${sd < 0 ? 'f' : 'b'}`, profileXZ([[XA, ZP - 80], [XB, ZP - 80], [XB, ZTOP], [XA + 500, ZTOP], [XA, ZU + 120]], 30).translate(0, y, 0).color(frame));
  add(`side-rib-${sd < 0 ? 'f' : 'b'}`, blk((XA + XB) / 2 + 250, sd * (W / 2 + 60), ZTOP - 100, XB - XA - 500, 60, 100).color(frame));
  for (const x of [XA + 700, 250, XB - 400]) add(`side-stiffener-${sd < 0 ? 'f' : 'b'}-${x}`, blk(x, sd * (W / 2 + 50), ZP - 80, 60, 40, ZTOP - ZP).color(frame));
}
add("rear-plate", blk(XB + 15, 0, ZP - 80, 30, W + 60, ZTOP - ZP + 80).color(frame));

// Two decks of panels: coarse (4 rows) on top, fine (dense bars) below.
const NP = 6, PL = (XB - XA) / NP;
for (let i = 0; i < NP; i++) {
  const x = XA + PL / 2 + i * PL;
  for (const sd of [-1, 1]) add(`upper-panel-${i}-${sd < 0 ? 'f' : 'b'}`, blk(x, sd * (W / 4), ZU - 20, PL - 24, W / 2 - 24, 20).color(panels));
  for (let k = 0; k < 3; k++) add(`upper-slot-${i}-${k}`, blk(x - PL / 3 + (k * PL) / 3, 0, ZU - 18, 50, W - 60, 22).color(dark));
  add(`lower-panel-${i}`, blk(x, 0, ZL - 20, PL - 24, W - 24, 20).color(panels));
  add(`deck-bearer-${i}`, cylinder(W, 60, 10).rotateX(90).translate(XA + i * PL, W / 2, ZU - 90).color(frame));
}
add("fines-pan", blk((XA + XB) / 2 + 100, 0, ZP, XB - XA - 200, W, 30).color(frame));

// Cullet on the upper deck: a thin bed near the feed end, then loose shards.
add("cullet-bed", profileXZ([[XA + 900, ZU], [XB - 20, ZU], [XB - 20, ZU + 120], [XB - 800, ZU + 70]], W - 40).color(cullet));
for (let i = 0; i < 20; i++) {
  const col = i % 5, row = Math.floor(i / 5);
  const x = XA + 250 + col * 420 + (row % 2) * 160;
  const y = -W / 2 + 230 + row * 380 + ((i * 37) % 90);
  const sz = 90 + ((i * 23) % 70);
  add(`shard-${i}`, box(sz * 1.4, sz, sz * 0.4, true).rotateX(i * 29).rotateY(i * 17).rotateZ(i * 53).translate(x, y, ZU + 30).color(i % 3 === 0 ? amber : i % 3 === 1 ? flint : cullet));
}

// Twin unbalanced motors on raked brackets, one each side.
for (const sd of [-1, 1]) {
  const y = sd * (W / 2 + 30);
  add(`motor-bracket-${sd < 0 ? 'f' : 'b'}`, profileXZ([[-500, ZP + 100], [300, ZP + 100], [300, ZTOP + 350], [-100, ZTOP + 350]], 50).translate(0, y + sd * 25, 0).color(frame));
  add(`motor-${sd < 0 ? 'f' : 'b'}`, cylinder(620, 190, 14).rotateY(-45).translate(-150, y + sd * 260, ZTOP + 120).color(dark));
  add(`motor-cap-${sd < 0 ? 'f' : 'b'}`, cylinder(90, 230, 14).rotateY(-45).translate(-150 - 440, y + sd * 260, ZTOP + 120 + 440).color(dark));
  add(`motor-plate-${sd < 0 ? 'f' : 'b'}`, blk(-100, y + sd * 160, ZTOP + 40, 400, 280, 60).color(frame));
}

// Rubber buffer mounts and the leg frame.
for (const sd of [-1, 1]) {
  const y = sd * (W / 2 + 160);
  for (const x of [XA + 400, XB - 400]) {
    add(`mount-arm-${sd < 0 ? 'f' : 'b'}-${x}`, blk(x, sd * (W / 2 + 100), ZP - 160, 260, 220, 100).color(frame));
    add(`buffer-${sd < 0 ? 'f' : 'b'}-${x}`, cylinder(200, 95, 12).translate(x, y, ZP - 360).color(dark));
    add(`leg-${sd < 0 ? 'f' : 'b'}-${x}`, blk(x, y, 0, 200, 200, ZP - 360).color(frame));
    add(`foot-${sd < 0 ? 'f' : 'b'}-${x}`, blk(x, y, 0, 360, 360, 25).color(frame));
  }
  add(`leg-rail-${sd < 0 ? 'f' : 'b'}`, blk((XA + XB) / 2, y, 350, XB - XA - 800, 140, 140).color(frame));
}

// Feed chute at the rear end.
add("feed-chute", profileXZ([[XB - 500, ZTOP + 80], [XB - 300, ZTOP - 20], [XB + 700, ZTOP + 650], [XB + 500, ZTOP + 750]], W - 300).color(frame));
for (const sd of [-1, 1]) add(`feed-cheek-${sd < 0 ? 'f' : 'b'}`, profileXZ([[XB - 500, ZTOP + 80], [XB + 500, ZTOP + 750], [XB + 500, ZTOP + 1000], [XB - 500, ZTOP + 330]], 30).translate(0, sd * (W / 2 - 135), 0).color(frame));
add("feed-post", blk(XB + 550, 0, 0, 160, 160, ZTOP + 650).color(frame));

// Three stepped outlets: coarse off the top deck, middle off the lower deck, fines from the pan.
add("coarse-lip", profileXZ([[XA, ZU], [XA, ZU - 30], [XA - 600, ZU - 520], [XA - 700, ZU - 470]], W / 2).translate(0, W / 4, 0).color(frame));
add("middle-chute", profileXZ([[XA, ZL], [XA, ZL - 30], [XA - 400, ZL - 640], [XA - 480, ZL - 580]], W / 2).translate(0, -W / 4, 0).color(frame));
add("fines-chute", rect(700, 700).loft([rect(1000, W - 200)], {
  planes: [{ plane: 'XY' as const, origin: [XA + 700, -W / 2 - 600, 500] as [number, number, number] }, { plane: 'XY' as const, origin: [XA + 700, -W / 2 + 300, ZP - 20] as [number, number, number] }],
  ruled: true,
}).color(frame));

// Bins, each holding its own grade of glass.
const bin = (name: string, x: number, y: number, fill: string, heap: string, sz: number) => {
  add(`${name}-bin`, rect(1000, 1000).loft([rect(1150, 1150)], {
    planes: [{ plane: 'XY' as const, origin: [x, y, 0] as [number, number, number] }, { plane: 'XY' as const, origin: [x, y, 700] as [number, number, number] }],
    ruled: true,
  }).subtract(blk(x, y, 80, 1000, 1000, 700)).color(bins));
  add(`${name}-heap`, rect(1060, 1060).loft([rect(400, 400)], {
    planes: [{ plane: 'XY' as const, origin: [x, y, 600] as [number, number, number] }, { plane: 'XY' as const, origin: [x, y, 900] as [number, number, number] }],
    ruled: true,
  }).color(fill));
  for (let i = 0; i < 4; i++) add(`${name}-piece-${i}`, box(sz * 1.4, sz, sz * 0.5, true).rotateX(i * 37).rotateZ(i * 61).translate(x - 250 + i * 160, y - 200 + (i % 2) * 300, 900 - (i % 2) * 60).color(i % 2 ? heap : fill));
};
bin("coarse", XA - 1000, 600, cullet, amber, 150);
bin("middle", XA - 900, -650, amber, flint, 90);
bin("fines", XA + 700, -W / 2 - 1250, flint, cullet, 40);

return p.model();
