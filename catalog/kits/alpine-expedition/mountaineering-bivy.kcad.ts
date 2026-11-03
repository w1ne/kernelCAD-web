// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mountaineering-bivy",
  license: 'CC0-1.0',
  title: "Mountaineering bivy sack",
  description: "Single-person storm bivy with a raised head hood, tapered foot end and short support arch. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "mountaineering bivy sack", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#65764c", { label: 'Asset color' });
const baseZ = 0.0;
const p = assembly("mountaineering-bivy");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const hy = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([0, 1, 0]).translate(x, y - length / 2, z - baseZ).scale(scale).color(color);

p.part("sleeping-bag-body", b(0, 0, 0, 820, 2080, 260, 0, 0, 0));
p.part("head-hood", b(0, -760, 175, 800, 620, 410, -12, 0, 0));
p.part("foot-panel", b(0, 840, 85, 700, 420, 170, 0, 0, 0));
p.part("hood-ridge", hy(0, -730, 470, 740, 18, 8));
p.part("zipper-flap", b(310, -50, 240, 36, 1000, 24, 0, 0, 0));

return p.model();
