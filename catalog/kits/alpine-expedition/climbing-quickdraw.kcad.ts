// SPDX-License-Identifier: CC0-1.0
// Climbing quickdraw: Quickdraw sling with two opposed carabiners and a stitched center webbing strap.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "climbing-quickdraw",
  license: 'CC0-1.0',
  title: "Climbing quickdraw",
  description: "Quickdraw sling with two opposed carabiners and a stitched center webbing strap. Knobs: overall scale plus aluminium, steel and nylon material colors.",
  tags: ["alpine expedition", "mountaineering", "climbing quickdraw", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });
const steel = param('steel', '#69747a', { label: 'Steel' });
const nylon = param('nylon', '#4c7063', { label: 'Nylon fabric' });

presets({
  stormWorn: { aluminium: '#8e9697', steel: '#525a5f', nylon: '#3b574d' },
  highVisibility: { nylon: '#e79135', aluminium: '#b6c0c2' },
});
const baseZ = -47;
const p = assembly("climbing-quickdraw");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale);
};

p.part("upper-carabiner", ring(0, 0, 340, 42, 112, 28, 12, "y").color(aluminium));
p.part("lower-carabiner", ring(0, 0, 65, 42, 112, 28, 12, "y").color(aluminium));
p.part("webbing-sling", b(0, 0, 195, 55, 34, 240, 0, 0, 0).color(nylon));
p.part("upper-gate", b(75, -25, 360, 25, 155, 25, 0, 16, 0).color(steel));
p.part("lower-gate", b(-75, 25, 42, 25, 155, 25, 0, -16, 0).color(steel));

return p.model();
