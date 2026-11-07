// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "expedition-duffel",
  license: 'CC0-1.0',
  title: "Expedition duffel bag",
  description: "Rugged haul duffel with end caps, top grab handles and paired carry straps. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "expedition duffel bag", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#596b54", { label: 'Asset color' });
const baseZ = 90.0;
const p = assembly("expedition-duffel");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);

p.part("bag-body", b(0, 0, 90, 1180, 540, 490, 0, 0, 0));
p.part("left-end-cap", c(-590, 0, 105, 460, 260, 10));
p.part("right-end-cap", c(590, 0, 105, 460, 260, 10));
p.part("carry-handle-0", b(-300, 0, 580, 70, 300, 220, 0, 0, 0));
p.part("carry-handle-1", b(300, 0, 580, 70, 300, 220, 0, 0, 0));
p.part("compression-strap-0", b(-480, 0, 220, 34, 570, 370, 0, 0, 0));
p.part("compression-strap-1", b(480, 0, 220, 34, 570, 370, 0, 0, 0));

return p.model();
