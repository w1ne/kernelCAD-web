// SPDX-License-Identifier: CC0-1.0
// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mountain-weather-meter",
  license: 'CC0-1.0',
  title: "Mountain weather meter",
  description: "Portable wind and weather meter with a compact base, mast, wind cups and direction vane. Knobs: overall scale and asset color.",
  tags: ["alpine expedition", "mountaineering", "mountain weather meter", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const color = param('color', "#75827a", { label: 'Asset color' });
const baseZ = 0.0;
const p = assembly("mountain-weather-meter");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);
const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);

p.part("base-foot", b(0, 0, 0, 250, 250, 48, 0, 0, 0));
p.part("mast", c(0, 0, 48, 780, 28, 8));
p.part("sensor-hub", c(0, 0, 810, 70, 66, 8));
p.part("wind-arm-0", c(130, 0, 830, 36, 16, 8));
p.part("wind-arm-1", c(-65, 112, 830, 36, 16, 8));
p.part("wind-arm-2", c(-65, -112, 830, 36, 16, 8));
p.part("wind-cup-0", c(180, 0, 800, 90, 34, 8));
p.part("wind-cup-1", c(-90, 156, 800, 90, 34, 8));
p.part("wind-cup-2", c(-90, -156, 800, 90, 34, 8));
p.part("direction-vane", hx(0, 0, 890, 310, 24, 8));
p.part("vane-fin", b(130, 0, 840, 30, 24, 110, 0, 0, 0));

return p.model();
