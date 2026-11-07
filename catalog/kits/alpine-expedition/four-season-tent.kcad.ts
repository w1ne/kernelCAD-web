// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "four-season-tent",
  license: 'CC0-1.0',
  title: "Four-season mountain tent",
  description: "Compact storm shelter with a low profile, reinforced fly, front entrance and corner stakes. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "four-season mountain tent", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#c05836", { label: 'Asset color' });
const baseZ = 0.0;
const p = assembly("four-season-tent");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);

p.part("tent-floor", b(0, 0, 0, 1550, 1880, 45, 0, 0, 0));
p.part("inner-body", b(0, 0, 45, 1210, 1530, 545, 0, 0, 0));
p.part("left-fly", b(-180, 0, 505, 500, 1820, 32, 0, -42, 0));
p.part("right-fly", b(180, 0, 505, 500, 1820, 32, 0, 42, 0));
p.part("door-flap", b(0, -785, 160, 540, 42, 390, 0, 0, 0));
p.part("corner-stake-0", c(-820, -930, 0, 160, 16, 8));
p.part("corner-stake-1", c(820, -930, 0, 160, 16, 8));
p.part("corner-stake-2", c(-820, 930, 0, 160, 16, 8));
p.part("corner-stake-3", c(820, 930, 0, 160, 16, 8));

return p.model();
