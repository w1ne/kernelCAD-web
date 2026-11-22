// SPDX-License-Identifier: CC0-1.0
// Alpine dry bag: Waterproof roll-top dry bag with a tapered fabric body, folded closure and buckle tabs.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "alpine-dry-bag",
  license: 'CC0-1.0',
  title: "Alpine dry bag",
  description: "Waterproof roll-top dry bag with a tapered fabric body, folded closure and buckle tabs. Knobs: overall scale plus nylon, webbing and polymer material colors.",
  tags: ["alpine expedition", "mountaineering", "alpine dry bag", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const nylon = param('nylon', '#4c7063', { label: 'Nylon fabric' });
const webbing = param('webbing', '#d7a43e', { label: 'Polyamide webbing' });
const polymer = param('polymer', '#53676b', { label: 'Engineering polymer' });

presets({
  stormWorn: { nylon: '#3b574d', webbing: '#a88030', polymer: '#415053' },
  highVisibility: { nylon: '#e79135', webbing: '#f1c64e' },
});
const baseZ = 0;
const p = assembly("alpine-dry-bag");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale);

p.part("bag-body", c(0, 0, 0, 750, 250, 12).color(nylon));
p.part("rolled-top", c(0, 0, 740, 80, 270, 12).color(nylon));
p.part("fold-over-closure", b(0, 0, 800, 490, 140, 42, 0, 0, 0).color(nylon));
p.part("buckle-tab-0", b(-245, 0, 755, 40, 110, 90, 0, 0, 0).color(webbing));
p.part("buckle-tab-1", b(245, 0, 755, 40, 110, 90, 0, 0, 0).color(polymer));
p.part("carry-handle", hx(0, 0, 840, 280, 18, 8).color(polymer));

return p.model();
