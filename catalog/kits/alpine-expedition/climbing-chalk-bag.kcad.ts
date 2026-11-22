// SPDX-License-Identifier: CC0-1.0
// Climbing chalk bag: Waist-mounted chalk pouch with a wide rim, drawcord collar and belt loop.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "climbing-chalk-bag",
  license: 'CC0-1.0',
  title: "Climbing chalk bag",
  description: "Waist-mounted chalk pouch with a wide rim, drawcord collar and belt loop. Knobs: overall scale plus nylon, polyester and webbing material colors.",
  tags: ["alpine expedition", "mountaineering", "climbing chalk bag", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const nylon = param('nylon', '#4c7063', { label: 'Nylon fabric' });
const polyester = param('polyester', '#bd7547', { label: 'Polyester fabric' });
const webbing = param('webbing', '#d7a43e', { label: 'Polyamide webbing' });

presets({
  stormWorn: { nylon: '#3b574d', polyester: '#935b37', webbing: '#a88030' },
  highVisibility: { nylon: '#e79135', polyester: '#f1c64e' },
});
const baseZ = 0;
const p = assembly("climbing-chalk-bag");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("pouch-body", c(0, 0, 0, 300, 155, 12).color(nylon));
p.part("rolled-rim", c(0, 0, 290, 45, 170, 12).color(polyester));
p.part("drawcord-tab", b(140, 0, 170, 40, 45, 55, 0, 0, 0).color(webbing));
p.part("belt-loop", b(0, 130, 240, 170, 38, 80, 0, 0, 0).color(webbing));
p.part("front-pocket", b(0, -145, 65, 175, 30, 100, 0, 0, 0).color(nylon));

return p.model();
