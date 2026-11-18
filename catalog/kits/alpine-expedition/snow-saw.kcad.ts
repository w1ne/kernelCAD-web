// SPDX-License-Identifier: CC0-1.0
// Snow pit saw: Long snow saw blade with a tooth row, stiffening spine and molded grip handle.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "snow-saw",
  license: 'CC0-1.0',
  title: "Snow pit saw",
  description: "Long snow saw blade with a tooth row, stiffening spine and molded grip handle. Knobs: overall scale plus aluminium, steel and rubber material colors.",
  tags: ["alpine expedition", "mountaineering", "snow pit saw", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });
const steel = param('steel', '#69747a', { label: 'Steel' });
const rubber = param('rubber', '#30383d', { label: 'Rubber' });

presets({
  stormWorn: { aluminium: '#8e9697', steel: '#525a5f', rubber: '#252c30' },
  highVisibility: { aluminium: '#8e9697', steel: '#69747a' },
});
const baseZ = -16.133208072516112;
const p = assembly("snow-saw");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale);
};

p.part("saw-blade", b(0, 0, 0, 920, 36, 18, 0, 0, 0).color(steel));
p.part("saw-tooth-0", b(-430, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-1", b(-386, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-2", b(-342, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-3", b(-298, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-4", b(-254, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-5", b(-210, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-6", b(-166, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-7", b(-122, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-8", b(-78, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-9", b(-34, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-10", b(10, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-11", b(54, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-12", b(98, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-13", b(142, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-14", b(186, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-15", b(230, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-16", b(274, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-17", b(318, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-18", b(362, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("saw-tooth-19", b(406, 0, -12, 25, 42, 22, 0, 24, 0).color(steel));
p.part("blade-spine", b(0, 0, 24, 920, 22, 26, 0, 0, 0).color(aluminium));
p.part("handle", b(510, 0, 0, 230, 78, 80, 0, 0, 0).color(rubber));
p.part("handle-loop", ring(610, 0, 40, 25, 56, 16, 10, "y").color(rubber));

return p.model();
