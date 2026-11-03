// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "avalanche-transceiver",
  license: 'CC0-1.0',
  title: "Avalanche transceiver",
  description: "Handheld avalanche beacon with a sloped display face, toggle control and carry clip. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "avalanche transceiver", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#e0ad34", { label: 'Asset color' });
const baseZ = 0.0;
const p = assembly("avalanche-transceiver");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);

p.part("beacon-body", b(0, 0, 0, 170, 310, 58, 0, 0, 0));
p.part("display-panel", b(0, -165, 20, 120, 24, 78, 0, 0, 0));
p.part("control-0", c(-52, -190, 15, 28, 18, 8));
p.part("control-1", c(0, -190, 15, 28, 18, 8));
p.part("control-2", c(52, -190, 15, 28, 18, 8));
p.part("belt-clip", b(0, 145, 35, 130, 28, 90, 0, 0, 0));
p.part("speaker-grille", c(0, -165, 4, 25, 46, 8));

return p.model();
