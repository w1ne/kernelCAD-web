// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "nested-sieves",
  license: 'CC0-1.0',
  title: "Nested field sieves",
  description: "Stack of three shallow round sieves with visible rims and different diameters. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "nested field sieves", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#929990", { label: 'Asset color' });
const baseZ = -19;
const p = assembly("nested-sieves");
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale).color(color);
};

p.part("sieve-0", ring(0, 0, 0, 38, 230, 18, 12, "z"));
p.part("sieve-1", ring(0, 0, 34, 38, 196, 18, 12, "z"));
p.part("sieve-2", ring(0, 0, 68, 38, 162, 18, 12, "z"));
p.part("center-post", c(0, 0, 0, 130, 14, 8));

return p.model();
