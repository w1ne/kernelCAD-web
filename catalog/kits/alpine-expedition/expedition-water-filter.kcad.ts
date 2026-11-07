// SPDX-License-Identifier: CC0-1.0
// Expedition squeeze water filter: Inline squeeze filter with a bottle-thread cap, protective end collars and short hose connector.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "expedition-water-filter",
  license: 'CC0-1.0',
  title: "Expedition squeeze water filter",
  description: "Inline squeeze filter with a bottle-thread cap, protective end collars and short hose connector. Knobs: overall scale plus polymer, silicone and rubber material colors.",
  tags: ["alpine expedition", "mountaineering", "expedition squeeze water filter", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#53676b', { label: 'Engineering polymer' });
const silicone = param('silicone', '#465860', { label: 'Silicone' });
const rubber = param('rubber', '#30383d', { label: 'Rubber' });

presets({
  stormWorn: { polymer: '#415053', silicone: '#37454b', rubber: '#252c30' },
  highVisibility: { polymer: '#e79135', rubber: '#30383d' },
});
const baseZ = 0;
const p = assembly("expedition-water-filter");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const hy = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([0, 1, 0]).translate(x, y - length / 2, z - baseZ).scale(scale);

p.part("filter-body", c(0, 0, 0, 270, 72, 12).color(polymer));
p.part("top-cap", c(0, 0, 270, 75, 82, 12).color(silicone));
p.part("bottom-cap", c(0, 0, 0, 45, 84, 12).color(silicone));
p.part("hose-connector", hy(0, 85, 305, 150, 24, 8).color(rubber));
p.part("flow-arrow-panel", b(0, -74, 140, 100, 16, 38, 0, 0, 0).color(polymer));

return p.model();
