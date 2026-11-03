// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "rescue-bivy",
  license: 'CC0-1.0',
  title: "Emergency rescue bivy",
  description: "Bright emergency bivy sack with a sealed foot, raised head hood and reflective-look side bands. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "emergency rescue bivy", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d34d36", { label: 'Asset color' });
const baseZ = 0.0;
const p = assembly("rescue-bivy");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};

p.part("bivy-shell", b(0, 0, 0, 900, 2100, 280, 0, 0, 0));
p.part("hood", b(0, -780, 170, 880, 560, 400, -10, 0, 0));
p.part("foot-seal", b(0, 930, 70, 780, 240, 120, 0, 0, 0));
p.part("side-band-0", b(-430, 0, 275, 26, 1600, 28, 0, 0, 0));
p.part("side-band-1", b(430, 0, 275, 26, 1600, 28, 0, 0, 0));
p.part("entry-flap", b(0, -930, 210, 500, 36, 240, 0, 0, 0));

return p.model();
