// SPDX-License-Identifier: CC0-1.0
// Expedition duffel bag: Rugged haul duffel with end caps, top grab handles and paired carry straps.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "expedition-duffel",
  license: 'CC0-1.0',
  title: "Expedition duffel bag",
  description: "Rugged haul duffel with end caps, top grab handles and paired carry straps. Knobs: overall scale plus nylon, polyester and webbing material colors.",
  tags: ["alpine expedition", "mountaineering", "expedition duffel bag", "low poly", "scene prop", "CC0"],
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
const baseZ = 90.0;
const p = assembly("expedition-duffel");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("bag-body", b(0, 0, 90, 1180, 540, 490, 0, 0, 0).color(polyester));
p.part("left-end-cap", c(-590, 0, 105, 460, 260, 10).color(nylon));
p.part("right-end-cap", c(590, 0, 105, 460, 260, 10).color(nylon));
p.part("carry-handle-0", b(-300, 0, 580, 70, 300, 220, 0, 0, 0).color(nylon));
p.part("carry-handle-1", b(300, 0, 580, 70, 300, 220, 0, 0, 0).color(nylon));
p.part("compression-strap-0", b(-480, 0, 220, 34, 570, 370, 0, 0, 0).color(webbing));
p.part("compression-strap-1", b(480, 0, 220, 34, 570, 370, 0, 0, 0).color(webbing));

return p.model();
