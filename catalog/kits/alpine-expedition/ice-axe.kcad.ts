// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ice-axe",
  license: 'CC0-1.0',
  title: "Mountaineering ice axe",
  description: "Classic alpine axe with a long shaft, curved pick, adze and pointed lower spike. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "mountaineering ice axe", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#727b7b", { label: 'Asset color' });
const baseZ = 0;
const p = assembly("ice-axe");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("shaft", c(0, 0, 0, 820, 26, 8));
p.part("pick", hx(0, 0, 790, 390, 32, 8));
p.part("pick-tip", b(-195, 0, 765, 95, 42, 82, 0, -20, 0));
p.part("adze", b(200, 0, 750, 175, 170, 42, 0, 0, 0));
p.part("lower-spike", c(0, 0, 0, 180, 32, 8));
p.part("leash-strap", b(0, 70, 310, 40, 30, 240, 0, 0, 0));

return p.model();
