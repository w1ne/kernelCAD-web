// SPDX-License-Identifier: CC0-1.0
// Alpine snowshoes: Pair of framed snowshoes with bindings, crossbars and raised toe loops.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "snowshoes",
  license: 'CC0-1.0',
  title: "Alpine snowshoes",
  description: "Pair of framed snowshoes with bindings, crossbars and raised toe loops. Knobs: overall scale plus aluminium, nylon and rubber material colors.",
  tags: ["alpine expedition", "mountaineering", "alpine snowshoes", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });
const nylon = param('nylon', '#4c7063', { label: 'Nylon fabric' });
const rubber = param('rubber', '#30383d', { label: 'Rubber' });

presets({
  stormWorn: { aluminium: '#8e9697', nylon: '#3b574d', rubber: '#252c30' },
  highVisibility: { nylon: '#e79135', aluminium: '#b6c0c2' },
});
const baseZ = -37;
const p = assembly("snowshoes");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const hy = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([0, 1, 0]).translate(x, y - length / 2, z - baseZ).scale(scale);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale);
};

p.part("shoe-frame-0", ring(-230, 0, 14, 36, 205, 22, 12, "z").color(aluminium));
p.part("shoe-frame-1", ring(230, 0, 14, 36, 205, 22, 12, "z").color(aluminium));
p.part("deck-binding-0", b(-230, 0, 28, 148, 360, 30, 0, 0, 0).color(rubber));
p.part("deck-binding-1", b(230, 0, 28, 148, 360, 30, 0, 0, 0).color(rubber));
p.part("crossbar-0", hy(-230, 0, 23, 340, 14, 8).color(aluminium));
p.part("crossbar-1", hy(230, 0, 23, 340, 14, 8).color(aluminium));
p.part("toe-loop-0", ring(-230, -135, 55, 24, 92, 16, 10, "y").color(nylon));
p.part("toe-loop-1", ring(230, -135, 55, 24, 92, 16, 10, "y").color(nylon));

return p.model();
