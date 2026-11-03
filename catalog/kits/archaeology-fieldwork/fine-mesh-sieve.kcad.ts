// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "fine-mesh-sieve",
  license: 'CC0-1.0',
  title: "Fine-mesh sample sieve",
  description: "Round hand sieve with a deep side band, dense crossbars and a short grip. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "fine-mesh sample sieve", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8f968d", { label: 'Asset color' });
const baseZ = -21;
const p = assembly("fine-mesh-sieve");
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);
const hy = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([0, 1, 0]).translate(x, y - length / 2, z - baseZ).scale(scale).color(color);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale).color(color);
};

p.part("sieve-rim", ring(0, 0, 0, 42, 230, 24, 14, "z"));
p.part("mesh-x-0", hx(0, -160, 22, 420, 4, 6));
p.part("mesh-x-1", hx(0, -120, 22, 420, 4, 6));
p.part("mesh-x-2", hx(0, -80, 22, 420, 4, 6));
p.part("mesh-x-3", hx(0, -40, 22, 420, 4, 6));
p.part("mesh-x-4", hx(0, 0, 22, 420, 4, 6));
p.part("mesh-x-5", hx(0, 40, 22, 420, 4, 6));
p.part("mesh-x-6", hx(0, 80, 22, 420, 4, 6));
p.part("mesh-x-7", hx(0, 120, 22, 420, 4, 6));
p.part("mesh-x-8", hx(0, 160, 22, 420, 4, 6));
p.part("mesh-y-0", hy(-160, 0, 22, 420, 4, 6));
p.part("mesh-y-1", hy(-120, 0, 22, 420, 4, 6));
p.part("mesh-y-2", hy(-80, 0, 22, 420, 4, 6));
p.part("mesh-y-3", hy(-40, 0, 22, 420, 4, 6));
p.part("mesh-y-4", hy(0, 0, 22, 420, 4, 6));
p.part("mesh-y-5", hy(40, 0, 22, 420, 4, 6));
p.part("mesh-y-6", hy(80, 0, 22, 420, 4, 6));
p.part("mesh-y-7", hy(120, 0, 22, 420, 4, 6));
p.part("mesh-y-8", hy(160, 0, 22, 420, 4, 6));
p.part("handle", hx(0, -260, 20, 190, 18, 8));

return p.model();
