// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "expedition-water-filter",
  license: 'CC0-1.0',
  title: "Expedition squeeze water filter",
  description: "Inline squeeze filter with a bottle-thread cap, protective end collars and short hose connector. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "expedition squeeze water filter", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#566f62", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("expedition-water-filter");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hy = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([0, 1, 0]).translate(x, y - length / 2, z - baseZ).scale(scale).color(color);

p.part("filter-body", c(0, 0, 0, 270, 72, 12));
p.part("top-cap", c(0, 0, 270, 75, 82, 12));
p.part("bottom-cap", c(0, 0, 0, 45, 84, 12));
p.part("hose-connector", hy(0, 85, 305, 150, 24, 8));
p.part("flow-arrow-panel", b(0, -74, 140, 100, 16, 38, 0, 0, 0));

return p.model();
