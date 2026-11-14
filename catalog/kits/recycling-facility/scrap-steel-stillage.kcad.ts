// SPDX-License-Identifier: CC0-1.0
// Scrap-steel stillage: the stackable steel cage pallet that collects
// offcuts and sorted ferrous scrap beside a line until a forklift takes it
// to the baler or the bay. What makes it a stillage rather than a crate:
// square corner posts standing on raised feet so forks enter from any side,
// stacking cones on the post tops, galvanised rod-mesh walls, a front
// half-gate dropped down on its hinges for hand loading, a steel floor,
// a load-rating plate, and a heap of rusty plate, angle and pipe offcuts.
// Generic visualization geometry at about real size (1.2 x 1.0 x 1.0 m),
// millimetres, Z up, gate toward -Y.

meta({
  name: "scrap-steel-stillage",
  license: 'CC0-1.0',
  title: "Scrap-steel stillage",
  description: "Stackable steel stillage at about real size: square corner posts on raised fork-entry feet, stacking cones, galvanised rod-mesh walls, a front half-gate dropped open on its hinges, steel floor, load plate and a pile of rusty plate, angle and pipe offcuts. Material controls: frame (painted steel), mesh (galvanised), scrap and rating plate. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "stillage", "scrap metal", "ferrous", "cage pallet", "containers", "forklift", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f5d9a', { label: 'Frame (painted steel)' });
const mesh = param('mesh', '#a8b0b0', { label: 'Mesh walls (galvanised)' });
const scrap = param('scrap', '#8a5a3c', { label: 'Scrap (rusty steel)' });
const plate = param('plate', '#f0b429', { label: 'Rating plate' });

presets({
  plant: { frame: '#2f5d9a', mesh: '#a8b0b0', scrap: '#8a5a3c', plate: '#f0b429' },
  weathered: { frame: '#4b5560', mesh: '#7f8580', scrap: '#6e4630', plate: '#b89a4a' },
  stainless: { frame: '#3b3f42', mesh: '#c9ced1', scrap: '#b8bec2', plate: '#e8e6dc' },
  highVisibility: { frame: '#e0b020', mesh: '#a8b0b0', scrap: '#8a5a3c', plate: '#d4402a' },
});

const p = assembly("scrap-steel-stillage");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const W = 1200, D = 1000, ZF = 160, ZT = 1000, PS = 60, HW = W / 2, HD = D / 2;

// Corner posts with fork-entry feet and stacking cones.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const x = sx * (HW - PS / 2), y = sy * (HD - PS / 2);
  add(`foot-${sx}-${sy}`, blk(x, y, 0, 140, 140, 12).color(frame));
  add(`post-${sx}-${sy}`, blk(x, y, 12, PS, PS, ZT - 12).color(frame));
  add(`cone-${sx}-${sy}`, cylinder(70, 26, 8).translate(x, y, ZT).union(cylinder(20, 38, 8).translate(x, y, ZT)).color(frame));
}

// Base frame and floor plate (open underneath for forks).
for (const sy of [-1, 1]) add(`base-rail-y-${sy}`, blk(0, sy * (HD - 30), ZF - 60, W - 2 * PS, 60, 60).color(frame));
for (const sx of [-1, 1]) add(`base-rail-x-${sx}`, blk(sx * (HW - 30), 0, ZF - 60, 60, D - 2 * PS, 60).color(frame));
add("floor", blk(0, 0, ZF, W - 20, D - 20, 6).color(frame));
for (const sx of [-1, 1]) add(`top-rail-x-${sx}`, blk(sx * (HW - 20), 0, ZT - 40, 40, D - 2 * PS, 40).color(frame));
add("top-rail-back", blk(0, HD - 20, ZT - 40, W - 2 * PS, 40, 40).color(frame));

// Rod mesh: back and two sides full height, front lower half fixed.
const bars = (n: number, span: number) => Array.from({ length: n }, (_, i) => -span / 2 + (span * (i + 1)) / (n + 1));
for (const x of bars(10, W - 2 * PS)) add(`mesh-back-${Math.round(x)}`, blk(x, HD - 20, ZF, 10, 10, ZT - ZF - 40).color(mesh));
for (const sx of [-1, 1]) for (const y of bars(8, D - 2 * PS)) add(`mesh-side-${sx}-${Math.round(y)}`, blk(sx * (HW - 20), y, ZF, 10, 10, ZT - ZF - 40).color(mesh));
for (const z of [400, 640]) {
  add(`mesh-hrail-back-${z}`, blk(0, HD - 20, z, W - 2 * PS, 12, 12).color(mesh));
  for (const sx of [-1, 1]) add(`mesh-hrail-side-${sx}-${z}`, blk(sx * (HW - 20), 0, z, 12, D - 2 * PS, 12).color(mesh));
}
const ZG = 560;
add("gate-sill", blk(0, -HD + 20, ZG - 40, W - 2 * PS, 40, 40).color(frame));
for (const x of bars(10, W - 2 * PS)) add(`mesh-front-${Math.round(x)}`, blk(x, -HD + 20, ZF, 10, 10, ZG - ZF - 40).color(mesh));

// Upper half-gate dropped outward on its hinges, hanging down the front.
const GH = ZT - ZG;
const gate = blk(0, 0, 0, W - 2 * PS, 30, 30).union(blk(0, 0, GH - 30, W - 2 * PS, 30, 30));
let g = gate;
for (const x of bars(10, W - 2 * PS)) g = g.union(blk(x, 0, 0, 10, 10, GH));
add("drop-gate", g.rotateX(180).rotateX(-14).translate(0, -HD - 25, ZG).color(frame));
for (const sx of [-1, 1]) add(`gate-hinge-${sx}`, cylinder(60, 18, 8).rotateY(90).translate(sx * (HW - PS - 100) - 30, -HD - 10, ZG - 20).color(mesh));

// Rating plate on the left post face.
add("rating-plate", blk(-HW + 30, -HD - 4, 760, 50, 6, 120).color(plate));

// Scrap load: plate offcuts at angles, angle iron and pipe stubs.
add("scrap-heap", sphere(420).subtract(blk(0, 0, -500, 1000, 1000, 500)).translate(0, 60, ZF).color(scrap));
const pieces: [number, number, number, number, number, number, number, number][] = [
  [-250, -120, 560, 520, 260, 12, 25, 18],
  [180, -80, 590, 460, 300, 10, -30, 40],
  [40, 220, 640, 600, 220, 14, 15, -20],
  [-330, 200, 520, 380, 240, 10, -20, 70],
];
for (const [x, y, z, w, d, t, rx, rz] of pieces) add(`plate-${x}-${y}`, box(w, d, t, true).rotateX(rx).rotateZ(rz).translate(x, y, z).color(scrap));
for (const [x, y, z, rz] of [[-80, -260, 600, 30], [280, 160, 540, -50]] as [number, number, number, number][]) {
  add(`angle-${x}`, box(700, 60, 8, true).union(box(700, 8, 60, true).translate(0, -26, 26)).rotateY(-12).rotateZ(rz).translate(x, y, z).color(scrap));
}
for (const [x, y, z, rz] of [[100, -200, 660, 70], [-220, 60, 700, -20]] as [number, number, number, number][]) {
  add(`pipe-${x}`, cylinder(520, 55, 10).subtract(cylinder(540, 44, 10).translate(0, 0, -10)).rotateY(80).rotateZ(rz).translate(x, y, z).color(mesh));
}

return p.model();
