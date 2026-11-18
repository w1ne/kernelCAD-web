// SPDX-License-Identifier: CC0-1.0
// Expedition tarp shelter: Ridgeline tarp with two adjustable support masts, broad roof panels and ground anchors.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "expedition-tarp",
  license: 'CC0-1.0',
  title: "Expedition tarp shelter",
  description: "Ridgeline tarp with two adjustable support masts, broad roof panels and ground anchors. Knobs: overall scale plus nylon, polyester and aluminium material colors.",
  tags: ["alpine expedition", "mountaineering", "expedition tarp shelter", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const nylon = param('nylon', '#4c7063', { label: 'Nylon fabric' });
const polyester = param('polyester', '#bd7547', { label: 'Polyester fabric' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });

presets({
  stormWorn: { nylon: '#3b574d', polyester: '#935b37', aluminium: '#8e9697' },
  highVisibility: { nylon: '#e79135', polyester: '#f1c64e' },
});
const baseZ = 0;
const p = assembly("expedition-tarp");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale);

p.part("left-roof-panel", b(-350, 0, 1190, 940, 2400, 36, 0, -12, 0).color(polyester));
p.part("right-roof-panel", b(350, 0, 1190, 940, 2400, 36, 0, 12, 0).color(nylon));
p.part("support-mast-left", c(-740, 0, 0, 1210, 34, 8).color(aluminium));
p.part("support-mast-right", c(740, 0, 0, 1210, 34, 8).color(aluminium));
p.part("ridgeline", hx(0, 0, 1210, 1500, 20, 8).color(aluminium));
p.part("ground-anchor-0", c(-900, -1040, 0, 210, 20, 8).color(aluminium));
p.part("ground-anchor-1", c(900, -1040, 0, 210, 20, 8).color(aluminium));
p.part("ground-anchor-2", c(-900, 1040, 0, 210, 20, 8).color(aluminium));
p.part("ground-anchor-3", c(900, 1040, 0, 210, 20, 8).color(aluminium));

return p.model();
