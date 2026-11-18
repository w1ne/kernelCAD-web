// SPDX-License-Identifier: CC0-1.0
// Nested field sieves: Stack of three shallow round sieves with visible rims and different diameters. Low-poly field visualization geometry in millimetres, Z-up; visible zones use stainless steel, aluminum.

meta({
  name: "nested-sieves",
  license: 'CC0-1.0',
  title: "Nested field sieves",
  description: "Stack of three shallow round sieves with visible rims and different diameters. Material controls: stainless steel, aluminum. Appearance presets: field ready and weathered.",
  tags: ["archaeology", "excavation", "fieldwork", "nested field sieves", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const aluminum = param('aluminum', '#9eafb7', { label: 'Aluminum' });
presets({
  fieldReady: { stainlessSteel: '#c7cdcf', aluminum: '#c3ccd0' },
  weathered: { stainlessSteel: '#7a8588', aluminum: '#788990' },
});
const baseZ = -19;
const p = assembly("nested-sieves");
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale);
};

p.part("sieve-0", ring(0, 0, 0, 38, 230, 18, 12, "z").color(stainlessSteel));
p.part("sieve-1", ring(0, 0, 34, 38, 196, 18, 12, "z").color(stainlessSteel));
p.part("sieve-2", ring(0, 0, 68, 38, 162, 18, 12, "z").color(stainlessSteel));
p.part("center-post", c(0, 0, 0, 130, 14, 8).color(aluminum));

return p.model();
