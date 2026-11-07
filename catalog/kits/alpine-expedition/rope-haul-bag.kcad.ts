// SPDX-License-Identifier: CC0-1.0
// Rope haul bag: Tall haul bag with a reinforced base, closure collar, shoulder straps and attachment loops.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "rope-haul-bag",
  license: 'CC0-1.0',
  title: "Rope haul bag",
  description: "Tall haul bag with a reinforced base, closure collar, shoulder straps and attachment loops. Knobs: overall scale plus nylon, polyester and webbing material colors.",
  tags: ["alpine expedition", "mountaineering", "rope haul bag", "low poly", "scene prop", "CC0"],
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
const p = assembly("rope-haul-bag");
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

p.part("bag-body", c(0, 0, 0, 860, 255, 12).color(polyester));
p.part("closure-collar", c(0, 0, 850, 130, 245, 12).color(nylon));
p.part("top-flap", b(0, 0, 965, 480, 420, 44, 0, 0, 0).color(nylon));
p.part("shoulder-strap-0", b(-155, 145, 300, 54, 48, 610, -8, 0, 0).color(webbing));
p.part("shoulder-strap-1", b(155, 145, 300, 54, 48, 610, -8, 0, 0).color(webbing));
p.part("haul-loop-0", ring(-160, 0, 950, 35, 55, 18, 10, "z").color(webbing));
p.part("haul-loop-1", ring(160, 0, 950, 35, 55, 18, 10, "z").color(webbing));

return p.model();
