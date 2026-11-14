// SPDX-License-Identifier: CC0-1.0
// Paper bale transport frame: the steel cradle a paper mill or MRF uses to
// carry loose-ended paper bales by forklift and stack them two high on a
// flatbed without crushing the bale underneath.
// What makes it a bale transport frame rather than a pallet: a welded base
// with two enclosed fork pockets, four corner posts carrying the weight of
// the frame above (so the bales never bear on each other), X-braced ends,
// conical stacking pins on the post tops and matching cups under the feet,
// and a pair of ratchet straps holding the bale down. The bale itself shows
// pressed paper layers in print and plain board, steel baling wires and a
// grade tag.
// Generic visualization geometry at about real size (1300 x 950 mm base,
// 1450 mm to the top of the pins), millimetres, Z up, fork pockets on -Y.

meta({
  name: "paper-bale-transport-frame",
  license: 'CC0-1.0',
  title: "Paper bale transport frame",
  description: "Stackable paper bale transport frame at about real size: welded base with two enclosed fork pockets, four corner posts with conical stacking pins and foot cups, X-braced ends, two ratchet straps, and a strapped paper bale with offset pressed layers, baling wires and a grade tag. Load choice (bale, empty). Material controls: painted steel frame, paper bale, polyester straps, ID plate and tag. millRed, galvanised, mixedPaper and weathered presets.",
  tags: ['bale frame', 'bale cradle', 'transport frame', 'stacking frame', 'paper bale', 'fork pockets', 'ratchet strap', 'recycling', 'materials recovery', 'waste management', 'containers', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#b8402f', { label: 'Frame, posts and braces (painted steel)' });
const paper = param('paper', '#c9b48a', { label: 'Paper bale' });
const strap = param('strap', '#f08c1a', { label: 'Ratchet straps (polyester)' });
const plate = param('plate', '#f2d23a', { label: 'ID plate and grade tag' });
const load = param('load', 'bale', { choices: ['bale', 'empty'], label: 'Load' });

presets({
  millRed: { frame: '#b8402f', paper: '#c9b48a', strap: '#f08c1a', plate: '#f2d23a' },
  galvanised: { frame: '#a5adb0', paper: '#b38a55', strap: '#2f6fa8', plate: '#ffffff' },
  mixedPaper: { frame: '#2f5fa8', paper: '#d8d2c2', strap: '#e0c020', plate: '#e85d3a' },
  weathered: { frame: '#6a4a3a', paper: '#9a8a6a', strap: '#8a6a3a', plate: '#b9a44a' },
});

const p = assembly("paper-bale-transport-frame");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const turned = (pts: [number, number][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Straight bar between two points in the XZ plane at constant y.
const barXZ = (x0: number, z0: number, x1: number, z1: number, y: number, w: number, t: number) => {
  const L = Math.hypot(x1 - x0, z1 - z0), a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(L, w, t, true).rotateY(-a).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};
// Same in the YZ plane at constant x.
const barYZ = (y0: number, z0: number, y1: number, z1: number, x: number, w: number, t: number) => {
  const L = Math.hypot(y1 - y0, z1 - z0), a = (Math.atan2(z1 - z0, y1 - y0) * 180) / Math.PI;
  return box(w, L, t, true).rotateX(a).translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
};

const W = 1300;
const D = 950;
const CUP = 70;
const BASE = 140;
const DECK = CUP + BASE;
const TOP = 1380;
const PX = W / 2 - 40;
const PY = D / 2 - 40;

// Foot cups under each post (the pins of the frame below drop into these).
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  add(`foot-cup-${sx}${sy}`, turned([[0, 0], [60, 0], [60, CUP], [0, CUP]]).subtract(turned([[0, -1], [42, -1], [20, CUP - 20], [0, CUP - 20]]))
    .translate(sx * PX, sy * PY, 0).color(frame));
}
// Base: perimeter channel and two enclosed fork pockets running front to back.
const pocketHoles = (y: number) => blk(-300, y, CUP + 15, 220, 100, BASE - 30).union(blk(300, y, CUP + 15, 220, 100, BASE - 30));
add("base-front", blk(0, -D / 2 + 30, CUP, W, 60, BASE).subtract(pocketHoles(-D / 2 + 30)).color(frame));
add("base-back", blk(0, D / 2 - 30, CUP, W, 60, BASE).subtract(pocketHoles(D / 2 - 30)).color(frame));
add("base-left", blk(-W / 2 + 30, 0, CUP, 60, D - 120, BASE).color(frame));
add("base-right", blk(W / 2 - 30, 0, CUP, 60, D - 120, BASE).color(frame));
for (const sx of [-1, 1]) {
  add(`fork-pocket-${sx}`, blk(sx * 300, 0, CUP, 260, D + 20, BASE).subtract(blk(sx * 300, 0, CUP + 15, 220, D + 60, BASE - 30)).color(frame));
}
for (let i = 0; i < 5; i++) add(`deck-slat-${i}`, blk(0, -D / 2 + 140 + i * ((D - 280) / 4), DECK, W - 120, 80, 12).color(frame));
add("id-plate", blk(-W / 2 + 160, -D / 2 - 2, CUP + 40, 200, 6, 60).color(plate));
add("id-plate-text", blk(-W / 2 + 140, -D / 2 - 6, CUP + 58, 120, 3, 24).color('#2f3437'));

// Corner posts with stacking pins on top.
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  add(`post-${sx}${sy}`, blk(sx * PX, sy * PY, DECK, 80, 80, TOP - DECK).color(frame));
  add(`post-cap-${sx}${sy}`, blk(sx * PX, sy * PY, TOP, 110, 110, 12).color(frame));
  add(`stack-pin-${sx}${sy}`, turned([[0, 0], [38, 0], [38, 20], [16, 70], [0, 70]]).translate(sx * PX, sy * PY, TOP + 12).color('#5d6366'));
}
// X-braced ends, top rails on the long sides, and lashing rings.
for (const sx of [-1, 1]) {
  const x = sx * PX;
  add(`end-brace-a-${sx}`, barYZ(-PY + 40, DECK + 40, PY - 40, TOP - 60, x, 40, 40).color(frame));
  add(`end-brace-b-${sx}`, barYZ(PY - 40, DECK + 40, -PY + 40, TOP - 60, x, 40, 40).color(frame));
  add(`end-top-rail-${sx}`, blk(x, 0, TOP - 60, 50, D - 80, 60).color(frame));
}
for (const sy of [-1, 1]) {
  add(`side-top-rail-${sy}`, blk(0, sy * PY, TOP - 60, W - 80, 50, 60).color(frame));
  for (const sx of [-1, 1]) add(`lash-ring-${sx}${sy}`, torus(40, 8, 10).rotateX(90).translate(sx * 260, sy * (PY + 34), DECK + 20).color('#5d6366'));
}

// The bale: pressed paper layers, slightly out of line, with wires and tag.
if (load.value === 'bale') {
  const BW = 1100;
  const BD = 760;
  const BH = 900;
  const N = 9;
  const lh = BH / N;
  const z0 = DECK + 12;
  for (let k = 0; k < N; k++) {
    const dx = (((k * 7) % 5) - 2) * 8;
    const dy = (((k * 3) % 5) - 2) * 9;
    const tone = k % 3 === 1 ? '#e6e1d4' : k % 4 === 2 ? '#8f6e46' : paper;
    add(`bale-layer-${k}`, blk(dx, dy, z0 + k * lh, BW - (k % 2) * 16, BD - ((k + 1) % 2) * 14, lh).color(tone));
  }
  for (let i = 0; i < 4; i++) {
    const x = -BW / 2 + 160 + (i * (BW - 320)) / 3;
    add(`bale-wire-top-${i}`, blk(x, 0, z0 + BH, 8, BD + 30, 6).color('#5d6366'));
    for (const sy of [-1, 1]) add(`bale-wire-side-${i}-${sy}`, blk(x, sy * (BD / 2 + 12), z0 + 10, 8, 6, BH - 10).color('#5d6366'));
  }
  add("grade-tag", box(150, 6, 110, true).rotateY(-8).translate(BW / 4, -BD / 2 - 16, z0 + BH * 0.55).color(plate));
  add("scrap-sheet", box(220, 8, 120, true).rotateX(-14).rotateZ(-10).translate(-BW / 3, -BD / 2 - 24, z0 + lh * 3).color('#e6e1d4'));

  // Two ratchet straps over the bale, hooked to the lashing rings.
  for (const sx of [-1, 1]) {
    const x = sx * 260;
    add(`strap-top-${sx}`, blk(x, 0, z0 + BH + 6, 50, BD + 20, 6).color(strap));
    for (const sy of [-1, 1]) add(`strap-side-${sx}-${sy}`, barYZ(sy * (BD / 2 + 14), z0 + BH + 6, sy * (PY + 34), DECK + 30, x, 50, 6).color(strap));
    add(`ratchet-${sx}`, blk(x, -BD / 2 - 26, z0 + BH * 0.62, 70, 40, 160).color('#4a4f52'));
    add(`ratchet-handle-${sx}`, barXZ(x - 20, z0 + BH * 0.62 + 150, x + 40, z0 + BH * 0.62 + 260, -BD / 2 - 40, 24, 16).color('#2f3437'));
  }
}

return p.model();
