// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "tent-pole-bundle",
  license: 'CC0-1.0',
  title: "Tent pole bundle",
  description: "Grouped segmented tent poles with end ferrules and a compact elastic keeper strap. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "tent pole bundle", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a7a7a0", { label: 'Asset color' });
const baseZ = 45.0;
const p = assembly("tent-pole-bundle");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("pole-0", hx(0, -190, 90, 1450, 18, 8));
p.part("pole-1", hx(0, -65, 90, 1450, 18, 8));
p.part("pole-2", hx(0, 60, 90, 1450, 18, 8));
p.part("pole-3", hx(0, 185, 90, 1450, 18, 8));
p.part("keeper-strap-front", b(0, -220, 45, 80, 470, 30, 0, 0, 0));
p.part("keeper-strap-rear", b(0, 220, 45, 80, 470, 30, 0, 0, 0));
p.part("end-ferrule-0", c(-720, -190, 84, 56, 22, 8));
p.part("end-ferrule-1", c(720, -190, 84, 56, 22, 8));
p.part("end-ferrule-2", c(-720, 185, 84, 56, 22, 8));
p.part("end-ferrule-3", c(720, 185, 84, 56, 22, 8));

return p.model();
