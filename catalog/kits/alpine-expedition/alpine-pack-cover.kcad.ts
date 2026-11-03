// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "alpine-pack-cover",
  license: 'CC0-1.0',
  title: "Alpine pack cover",
  description: "Draped rain cover for a tall expedition pack with a rolled hem and side tension straps. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "alpine pack cover", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#cf6337", { label: 'Asset color' });
const baseZ = 30.0;
const p = assembly("alpine-pack-cover");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);

p.part("cover-dome", b(0, 0, 30, 650, 450, 780, 0, 0, 0));
p.part("front-apron", b(0, -238, 70, 625, 28, 570, -8, 0, 0));
p.part("side-strap-0", b(-325, 0, 180, 26, 500, 40, 0, 0, 0));
p.part("side-strap-1", b(325, 0, 180, 26, 500, 40, 0, 0, 0));
p.part("hem-band", b(0, 0, 40, 690, 490, 36, 0, 0, 0));
p.part("cord-lock", c(0, -270, 72, 54, 28, 8));

return p.model();
