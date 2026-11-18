// SPDX-License-Identifier: CC0-1.0
// Mountaineering crampons: Pair of boot crampons with broad foot plates, binding bars and forward-facing points.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "crampons",
  license: 'CC0-1.0',
  title: "Mountaineering crampons",
  description: "Pair of boot crampons with broad foot plates, binding bars and forward-facing points. Knobs: overall scale plus steel and aluminium material colors.",
  tags: ["alpine expedition", "mountaineering", "mountaineering crampons", "low poly", "scene prop", "CC0"],
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
const baseZ = 10.988666488662332;
const p = assembly("crampons");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const hy = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([0, 1, 0]).translate(x, y - length / 2, z - baseZ).scale(scale);

p.part("foot-plate-0", b(-190, 0, 28, 150, 330, 28, 0, 0, 0).color(aluminium));
p.part("foot-plate-1", b(190, 0, 28, 150, 330, 28, 0, 0, 0).color(aluminium));
p.part("front-point-0", b(-280, -210, 15, 36, 150, 38, 0, -15, 0).color(steel));
p.part("front-point-1", b(-190, -210, 15, 36, 150, 38, 0, -15, 0).color(steel));
p.part("front-point-2", b(-100, -210, 15, 36, 150, 38, 0, -15, 0).color(steel));
p.part("front-point-3", b(100, -210, 15, 36, 150, 38, 0, -15, 0).color(steel));
p.part("front-point-4", b(190, -210, 15, 36, 150, 38, 0, -15, 0).color(steel));
p.part("front-point-5", b(280, -210, 15, 36, 150, 38, 0, -15, 0).color(steel));
p.part("rear-point-0", b(-250, 210, 15, 34, 120, 34, 0, 14, 0).color(steel));
p.part("rear-point-1", b(-130, 210, 15, 34, 120, 34, 0, 14, 0).color(steel));
p.part("rear-point-2", b(130, 210, 15, 34, 120, 34, 0, 14, 0).color(steel));
p.part("rear-point-3", b(250, 210, 15, 34, 120, 34, 0, 14, 0).color(steel));
p.part("binding-bar-0", hy(-190, 0, 54, 360, 14, 8).color(aluminium));
p.part("binding-bar-1", hy(190, 0, 54, 360, 14, 8).color(aluminium));

return p.model();
