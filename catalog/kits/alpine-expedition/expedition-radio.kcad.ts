// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "expedition-radio",
  license: 'CC0-1.0',
  title: "Expedition field radio",
  description: "Rugged handheld VHF-style field radio with antenna, channel knob, speaker and push-to-talk key. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "expedition field radio", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#657353", { label: 'Asset color' });
const baseZ = 0.0;
const p = assembly("expedition-radio");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);

p.part("radio-body", b(0, 0, 0, 170, 105, 360, 0, 0, 0));
p.part("front-face", b(0, -58, 30, 145, 18, 290, 0, 0, 0));
p.part("antenna", c(56, 18, 340, 310, 12, 8));
p.part("channel-knob", c(-46, -82, 325, 58, 25, 8));
p.part("speaker-grid", b(0, -78, 220, 105, 22, 92, 0, 0, 0));
p.part("push-to-talk", b(94, 0, 210, 30, 32, 122, 0, 0, 0));

return p.model();
