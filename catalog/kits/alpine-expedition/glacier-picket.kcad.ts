// SPDX-License-Identifier: CC0-1.0
// Glacier snow picket: Long snow picket with a tapered tip, attachment holes and a top sling eye.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "glacier-picket",
  license: 'CC0-1.0',
  title: "Glacier snow picket",
  description: "Long snow picket with a tapered tip, attachment holes and a top sling eye. Knobs: overall scale plus steel and aluminium material colors.",
  tags: ["alpine expedition", "mountaineering", "glacier snow picket", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#69747a', { label: 'Steel' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });

presets({
  stormWorn: { steel: '#525a5f', aluminium: '#8e9697' },
  highVisibility: { steel: '#525a5f', aluminium: '#b6c0c2' },
});
const baseZ = -1.9125224351136438;
const p = assembly("glacier-picket");
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

p.part("picket-web", b(0, 0, 0, 90, 36, 720, 0, -2, 0).color(steel));
p.part("reinforced-head", b(0, 0, 685, 145, 50, 70, 0, 0, 0).color(steel));
p.part("attachment-hole-rim-0", ring(0, 0, 120, 18, 27, 10, 8, "y").color(steel));
p.part("attachment-hole-rim-1", ring(0, 0, 235, 18, 27, 10, 8, "y").color(steel));
p.part("attachment-hole-rim-2", ring(0, 0, 350, 18, 27, 10, 8, "y").color(steel));
p.part("attachment-hole-rim-3", ring(0, 0, 465, 18, 27, 10, 8, "y").color(steel));
p.part("top-eye", ring(0, 0, 820, 25, 56, 16, 8, "y").color(aluminium));
p.part("lower-tip", b(0, 0, 0, 50, 36, 140, 0, -5, 0).color(steel));

return p.model();
