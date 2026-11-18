// SPDX-License-Identifier: CC0-1.0
// Climbing rope coil: Compact stack of dynamic climbing rope loops with two loose ends and a keeper strap.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "climbing-rope-coil",
  license: 'CC0-1.0',
  title: "Climbing rope coil",
  description: "Compact stack of dynamic climbing rope loops with two loose ends and a keeper strap. Knobs: overall scale plus nylon, polyester and webbing material colors.",
  tags: ["alpine expedition", "mountaineering", "climbing rope coil", "low poly", "scene prop", "CC0"],
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
const p = assembly("climbing-rope-coil");
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

p.part("rope-loop-0", ring(0, 0, 24, 30, 310, 30, 14, "z").color(nylon));
p.part("rope-loop-1", ring(0, 0, 50, 30, 303, 30, 14, "z").color(nylon));
p.part("rope-loop-2", ring(0, 0, 76, 30, 296, 30, 14, "z").color(nylon));
p.part("rope-loop-3", ring(0, 0, 102, 30, 289, 30, 14, "z").color(nylon));
p.part("rope-loop-4", ring(0, 0, 128, 30, 282, 30, 14, "z").color(nylon));
p.part("keeper-strap", b(0, -300, 40, 80, 75, 125, 0, 0, 0).color(webbing));
p.part("rope-end-one", c(0, -330, 0, 150, 16, 8).color(nylon));
p.part("rope-end-two", c(120, 280, 0, 175, 16, 8).color(polyester));

return p.model();
