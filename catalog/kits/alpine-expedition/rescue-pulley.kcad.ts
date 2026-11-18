// SPDX-License-Identifier: CC0-1.0
// Alpine rescue pulley: Compact rescue pulley with a side plate, large sheave, axle pin and rope attachment eye.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "rescue-pulley",
  license: 'CC0-1.0',
  title: "Alpine rescue pulley",
  description: "Compact rescue pulley with a side plate, large sheave, axle pin and rope attachment eye. Knobs: overall scale plus aluminium and steel material colors.",
  tags: ["alpine expedition", "mountaineering", "alpine rescue pulley", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });
const steel = param('steel', '#69747a', { label: 'Steel' });

presets({
  stormWorn: { aluminium: '#8e9697', steel: '#525a5f' },
  highVisibility: { aluminium: '#8e9697', steel: '#69747a' },
});
const baseZ = -60;
const p = assembly("rescue-pulley");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale);
};

p.part("sheave", ring(0, 0, 85, 48, 145, 28, 14, "y").color(steel));
p.part("side-plate-front", b(0, -55, 55, 295, 34, 205, 0, 0, 0).color(aluminium));
p.part("side-plate-rear", b(0, 55, 55, 295, 34, 205, 0, 0, 0).color(aluminium));
p.part("axle-pin", c(0, -80, 58, 70, 42, 10).color(steel));
p.part("attachment-eye-top", ring(0, 0, 235, 32, 62, 18, 10, "y").color(aluminium));
p.part("attachment-eye-bottom", ring(0, 0, 0, 28, 56, 16, 10, "y").color(aluminium));

return p.model();
