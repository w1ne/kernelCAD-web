// SPDX-License-Identifier: CC0-1.0
// Expedition headlamp: Wide-beam headlamp with an adjustable elastic band, central lamp housing and side buckles.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "expedition-headlamp",
  license: 'CC0-1.0',
  title: "Expedition headlamp",
  description: "Wide-beam headlamp with an adjustable elastic band, central lamp housing and side buckles. Knobs: overall scale plus polymer, glass and nylon material colors.",
  tags: ["alpine expedition", "mountaineering", "expedition headlamp", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#53676b', { label: 'Engineering polymer' });
const glass = param('glass', '#5c9eaa', { label: 'Glass' });
const nylon = param('nylon', '#4c7063', { label: 'Nylon fabric' });

presets({
  stormWorn: { polymer: '#415053', glass: '#487b85', nylon: '#3b574d' },
  highVisibility: { nylon: '#e79135', glass: '#5c9eaa' },
});
const baseZ = 0.0;
const p = assembly("expedition-headlamp");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("lamp-housing", b(0, -70, 0, 210, 100, 115, 0, 0, 0).color(polymer));
p.part("lamp-lens", c(0, -126, 25, 80, 56, 10).color(glass));
p.part("headband-0", b(-285, 0, 32, 710, 34, 58, 0, 0, 0).color(nylon));
p.part("headband-1", b(285, 0, 32, 710, 34, 58, 0, 0, 0).color(nylon));
p.part("band-buckle-0", b(-205, 0, 32, 52, 84, 72, 0, 0, 0).color(nylon));
p.part("band-buckle-1", b(205, 0, 32, 52, 84, 72, 0, 0, 0).color(nylon));
p.part("top-adjuster", b(0, 0, 70, 130, 38, 28, 0, 0, 0).color(polymer));

return p.model();
