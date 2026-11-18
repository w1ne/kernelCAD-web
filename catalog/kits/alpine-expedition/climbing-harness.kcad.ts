// SPDX-License-Identifier: CC0-1.0
// Climbing harness: Sit harness with a padded waist belt, two leg loops, tie-in points and gear loops.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "climbing-harness",
  license: 'CC0-1.0',
  title: "Climbing harness",
  description: "Sit harness with a padded waist belt, two leg loops, tie-in points and gear loops. Knobs: overall scale plus nylon, webbing and aluminium material colors.",
  tags: ["alpine expedition", "mountaineering", "climbing harness", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const nylon = param('nylon', '#4c7063', { label: 'Nylon fabric' });
const webbing = param('webbing', '#d7a43e', { label: 'Polyamide webbing' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });

presets({
  stormWorn: { nylon: '#3b574d', webbing: '#a88030', aluminium: '#8e9697' },
  highVisibility: { nylon: '#e79135', webbing: '#f1c64e' },
});
const baseZ = 8.0;
const p = assembly("climbing-harness");
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

p.part("waist-belt", b(0, 0, 8, 520, 150, 48, 0, 0, 0).color(nylon));
p.part("leg-loop-0", ring(-180, 0, 28, 40, 168, 34, 12, "z").color(webbing));
p.part("leg-loop-1", ring(180, 0, 28, 40, 168, 34, 12, "z").color(webbing));
p.part("tie-in-bridge", b(0, -112, 18, 125, 40, 45, 0, 0, 0).color(aluminium));
p.part("gear-loop-0", c(-205, 60, 32, 35, 28, 8).color(webbing));
p.part("gear-loop-1", c(205, 60, 32, 35, 28, 8).color(webbing));
p.part("adjuster-0", b(-110, 0, 60, 64, 38, 32, 0, 0, 0).color(nylon));
p.part("adjuster-1", b(110, 0, 60, 64, 38, 32, 0, 0, 0).color(nylon));

return p.model();
