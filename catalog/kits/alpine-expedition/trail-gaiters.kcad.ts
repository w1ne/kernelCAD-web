// SPDX-License-Identifier: CC0-1.0
// Trail gaiters: Pair of ankle gaiters with front hooks, instep straps and upper closure tabs.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "trail-gaiters",
  license: 'CC0-1.0',
  title: "Trail gaiters",
  description: "Pair of ankle gaiters with front hooks, instep straps and upper closure tabs. Knobs: overall scale plus nylon, rubber and steel material colors.",
  tags: ["alpine expedition", "mountaineering", "trail gaiters", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const nylon = param('nylon', '#4c7063', { label: 'Nylon fabric' });
const rubber = param('rubber', '#30383d', { label: 'Rubber' });
const steel = param('steel', '#69747a', { label: 'Steel' });

presets({
  stormWorn: { nylon: '#3b574d', rubber: '#252c30', steel: '#525a5f' },
  highVisibility: { nylon: '#e79135', rubber: '#30383d' },
});
const baseZ = 0.0;
const p = assembly("trail-gaiters");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("gaiter-shell-0", b(-170, 0, 0, 220, 320, 360, 0, 0, 0).color(nylon));
p.part("gaiter-shell-1", b(170, 0, 0, 220, 320, 360, 0, 0, 0).color(nylon));
p.part("instep-strap-0", b(-170, 0, 10, 290, 40, 24, 0, 0, 0).color(rubber));
p.part("instep-strap-1", b(170, 0, 10, 290, 40, 24, 0, 0, 0).color(rubber));
p.part("front-hook-0", c(-170, -168, 245, 70, 18, 8).color(steel));
p.part("front-hook-1", c(170, -168, 245, 70, 18, 8).color(steel));
p.part("closure-tab-0", b(-170, 0, 355, 80, 120, 40, 0, 0, 0).color(nylon));
p.part("closure-tab-1", b(170, 0, 355, 80, 120, 40, 0, 0, 0).color(nylon));

return p.model();
