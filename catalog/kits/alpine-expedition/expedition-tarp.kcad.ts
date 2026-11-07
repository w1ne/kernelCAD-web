// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "expedition-tarp",
  license: 'CC0-1.0',
  title: "Expedition tarp shelter",
  description: "Ridgeline tarp with two adjustable support masts, broad roof panels and ground anchors. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "expedition tarp shelter", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#78804f", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("expedition-tarp");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("left-roof-panel", b(-350, 0, 1190, 940, 2400, 36, 0, -12, 0));
p.part("right-roof-panel", b(350, 0, 1190, 940, 2400, 36, 0, 12, 0));
p.part("support-mast-left", c(-740, 0, 0, 1210, 34, 8));
p.part("support-mast-right", c(740, 0, 0, 1210, 34, 8));
p.part("ridgeline", hx(0, 0, 1210, 1500, 20, 8));
p.part("ground-anchor-0", c(-900, -1040, 0, 210, 20, 8));
p.part("ground-anchor-1", c(900, -1040, 0, 210, 20, 8));
p.part("ground-anchor-2", c(-900, 1040, 0, 210, 20, 8));
p.part("ground-anchor-3", c(900, 1040, 0, 210, 20, 8));

return p.model();
