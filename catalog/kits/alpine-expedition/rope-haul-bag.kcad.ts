// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "rope-haul-bag",
  license: 'CC0-1.0',
  title: "Rope haul bag",
  description: "Tall haul bag with a reinforced base, closure collar, shoulder straps and attachment loops. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "rope haul bag", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5d6b58", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("rope-haul-bag");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale).color(color);
};

p.part("bag-body", c(0, 0, 0, 860, 255, 12));
p.part("closure-collar", c(0, 0, 850, 130, 245, 12));
p.part("top-flap", b(0, 0, 965, 480, 420, 44, 0, 0, 0));
p.part("shoulder-strap-0", b(-155, 145, 300, 54, 48, 610, -8, 0, 0));
p.part("shoulder-strap-1", b(155, 145, 300, 54, 48, 610, -8, 0, 0));
p.part("haul-loop-0", ring(-160, 0, 950, 35, 55, 18, 10, "z"));
p.part("haul-loop-1", ring(160, 0, 950, 35, 55, 18, 10, "z"));

return p.model();
