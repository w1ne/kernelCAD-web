// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ski-touring-skins",
  license: 'CC0-1.0',
  title: "Ski touring skins",
  description: "Pair of climbing skins with tapered tails, tip loops and adjustable tail clips. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "ski touring skins", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#596d58", { label: 'Asset color' });
const baseZ = -44;
const p = assembly("ski-touring-skins");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale).color(color);
};

p.part("skin-strip-0", b(-105, 0, 0, 120, 1650, 24, 0, 0, 0));
p.part("skin-strip-1", b(105, 0, 0, 120, 1650, 24, 0, 0, 0));
p.part("tip-loop-0", ring(-105, -840, 12, 24, 56, 14, 10, "y"));
p.part("tip-loop-1", ring(105, -840, 12, 24, 56, 14, 10, "y"));
p.part("tail-clip-0", b(-105, 825, 0, 150, 110, 44, 0, 0, 0));
p.part("tail-clip-1", b(105, 825, 0, 150, 110, 44, 0, 0, 0));
p.part("backing-tab-0", b(-105, 0, 28, 46, 900, 18, 0, 0, 0));
p.part("backing-tab-1", b(105, 0, 28, 46, 900, 18, 0, 0, 0));

return p.model();
