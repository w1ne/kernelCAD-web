// SPDX-License-Identifier: CC0-1.0
// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "excavation-camera-tripod",
  license: 'CC0-1.0',
  title: "Camera field tripod",
  description: "Three-leg camera tripod with a compact pan head, center column and leveling plate. Knobs: overall scale and asset color.",
  tags: ["archaeology", "excavation", "fieldwork", "camera field tripod", "low poly", "scene prop", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#838d88", { label: 'Asset color' });
const baseZ = 8.425589;
const p = assembly("excavation-camera-tripod");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("tripod-leg-0", b(-185, -140, 0, 26, 26, 620, -12, 16, 0));
p.part("tripod-leg-1", b(185, -140, 0, 26, 26, 620, -12, -16, 0));
p.part("tripod-leg-2", b(0, 205, 0, 26, 26, 620, 16, 0, 0));
p.part("center-column", c(0, 0, 555, 150, 24, 8));
p.part("leveling-plate", b(0, 0, 690, 180, 145, 28, 0, 0, 0));
p.part("pan-head", c(0, 0, 718, 62, 36, 8));
p.part("camera-plate", hx(0, 0, 775, 110, 16, 8));

return p.model();
