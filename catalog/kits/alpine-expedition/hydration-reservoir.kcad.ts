// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "hydration-reservoir",
  license: 'CC0-1.0',
  title: "Hydration reservoir",
  description: "Flat hydration bladder with a wide fill cap, hose port, drinking tube and bite valve. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "hydration reservoir", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#4f7e87", { label: 'Asset color' });
const baseZ = 0.0;
const p = assembly("hydration-reservoir");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("bladder-body", b(0, 0, 0, 420, 660, 84, 0, 0, 0));
p.part("top-seam", b(0, 0, 84, 430, 38, 22, 0, 0, 0));
p.part("fill-cap", c(0, -340, 60, 65, 72, 10));
p.part("drink-tube", hx(0, 345, 35, 650, 16, 8));
p.part("bite-valve", c(320, 345, 15, 85, 24, 8));
p.part("hose-clip", b(0, 285, 72, 95, 36, 28, 0, 0, 0));

return p.model();
