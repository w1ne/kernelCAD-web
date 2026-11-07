// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "alpine-rescue-stretcher",
  license: 'CC0-1.0',
  title: "Alpine rescue stretcher",
  description: "Basket stretcher with a deep bed, perimeter rails, cross straps and carry handles. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "alpine rescue stretcher", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d0a641", { label: 'Asset color' });
const baseZ = 67;
const p = assembly("alpine-rescue-stretcher");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);
const hy = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([0, 1, 0]).translate(x, y - length / 2, z - baseZ).scale(scale).color(color);

p.part("stretcher-bed", b(0, 0, 95, 620, 2080, 115, 0, 0, 0));
p.part("perimeter-rail-0", hx(0, -300, 150, 2240, 24, 8));
p.part("perimeter-rail-1", hx(0, 300, 150, 2240, 24, 8));
p.part("cross-strap-0", hy(-780, 0, 164, 580, 14, 8));
p.part("cross-strap-1", hy(-260, 0, 164, 580, 14, 8));
p.part("cross-strap-2", hy(260, 0, 164, 580, 14, 8));
p.part("cross-strap-3", hy(780, 0, 164, 580, 14, 8));
p.part("carry-handle-0", hx(-410, 0, 95, 280, 28, 8));
p.part("carry-handle-1", hx(410, 0, 95, 280, 28, 8));
p.part("end-wall-0", b(-1070, 0, 150, 42, 620, 180, 0, 0, 0));
p.part("end-wall-1", b(1070, 0, 150, 42, 620, 180, 0, 0, 0));

return p.model();
