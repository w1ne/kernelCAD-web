// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "alpine-helmet",
  license: 'CC0-1.0',
  title: "Alpine climbing helmet",
  description: "Lightweight climbing helmet with a faceted shell, short brim, crown ribs and chin strap. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "alpine climbing helmet", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#e2b735", { label: 'Asset color' });
const baseZ = 0.0;
const p = assembly("alpine-helmet");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("helmet-shell", c(0, 0, 60, 190, 175, 12));
p.part("front-brim", b(0, -135, 60, 280, 110, 42, 0, 0, 0));
p.part("crown-rib-0", b(-95, 0, 235, 28, 250, 28, 0, 0, 0));
p.part("crown-rib-1", b(0, 0, 235, 28, 250, 28, 0, 0, 0));
p.part("crown-rib-2", b(95, 0, 235, 28, 250, 28, 0, 0, 0));
p.part("chin-strap-0", b(-100, 0, 0, 20, 210, 250, 0, 0, 0));
p.part("chin-strap-1", b(100, 0, 0, 20, 210, 250, 0, 0, 0));
p.part("chin-buckle", hx(0, -90, 35, 90, 18, 8));

return p.model();
