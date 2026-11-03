// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "tent-footprint",
  license: 'CC0-1.0',
  title: "Tent footprint sheet",
  description: "Rectangular groundsheet with reinforced corners and low edge loops for a mountain tent. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "tent footprint sheet", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#666f68", { label: 'Asset color' });
const baseZ = 0.0;
const p = assembly("tent-footprint");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale).color(color);
};

p.part("sheet", b(0, 0, 0, 1700, 2200, 18, 0, 0, 0));
p.part("corner-loop-0", ring(-760, -1010, 12, 24, 42, 12, 8, "z"));
p.part("corner-loop-1", ring(760, -1010, 12, 24, 42, 12, 8, "z"));
p.part("corner-loop-2", ring(-760, 1010, 12, 24, 42, 12, 8, "z"));
p.part("corner-loop-3", ring(760, 1010, 12, 24, 42, 12, 8, "z"));
p.part("center-seam", b(0, 0, 19, 18, 2180, 8, 0, 0, 0));

return p.model();
