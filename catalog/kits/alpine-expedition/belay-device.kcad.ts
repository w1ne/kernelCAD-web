// SPDX-License-Identifier: CC0-1.0
// Belay device: Tube-style belay device with twin rope slots, guide ears and a central attachment eye.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "belay-device",
  license: 'CC0-1.0',
  title: "Belay device",
  description: "Tube-style belay device with twin rope slots, guide ears and a central attachment eye. Knobs: overall scale plus aluminium and steel material colors.",
  tags: ["alpine expedition", "mountaineering", "belay device", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const aluminium = param('aluminium', '#b6c0c2', { label: 'Aluminium' });
const steel = param('steel', '#69747a', { label: 'Steel' });

presets({
  stormWorn: { aluminium: '#8e9697', steel: '#525a5f' },
  highVisibility: { aluminium: '#8e9697', steel: '#69747a' },
});
const baseZ = -37.0;
const p = assembly("belay-device");
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

p.part("device-body", b(0, 0, 0, 250, 190, 70, 0, 0, 0).color(aluminium));
p.part("rope-slot-rim-0", ring(-72, 0, 0, 74, 63, 22, 10, "z").color(aluminium));
p.part("rope-slot-rim-1", ring(72, 0, 0, 74, 63, 22, 10, "z").color(aluminium));
p.part("attachment-eye", ring(0, 0, 145, 34, 58, 18, 10, "y").color(steel));
p.part("guide-ear-left", b(-132, 0, 22, 32, 175, 84, 0, 0, 0).color(aluminium));
p.part("guide-ear-right", b(132, 0, 22, 32, 175, 84, 0, 0, 0).color(aluminium));

return p.model();
