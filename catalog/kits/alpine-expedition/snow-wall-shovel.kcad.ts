// SPDX-License-Identifier: CC0-1.0
// Snow wall shovel: Compact snow shovel with a broad blade, angled shaft and transverse hand grip.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "snow-wall-shovel",
  license: 'CC0-1.0',
  title: "Snow wall shovel",
  description: "Compact snow shovel with a broad blade, angled shaft and transverse hand grip. Knobs: overall scale plus aluminium, steel and rubber material colors.",
  tags: ["alpine expedition", "mountaineering", "snow wall shovel", "low poly", "scene prop", "CC0"],
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
const baseZ = -4.5670167313328704;
const p = assembly("snow-wall-shovel");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale);

p.part("shovel-blade", b(0, -230, 0, 390, 95, 420, -8, 0, 0).color(steel));
p.part("shaft", c(0, 0, 400, 780, 24, 8).color(aluminium));
p.part("blade-rib", b(0, -284, 80, 45, 26, 260, 0, 0, 0).color(steel));
p.part("grip", hx(0, 0, 1200, 260, 25, 8).color(rubber));
p.part("grip-center", c(0, 0, 1160, 80, 38, 8).color(rubber));

return p.model();
