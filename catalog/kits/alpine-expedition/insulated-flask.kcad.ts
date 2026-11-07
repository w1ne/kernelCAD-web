// SPDX-License-Identifier: CC0-1.0
// Insulated mountain flask: Double-wall flask with a shoulder, screw cap, protective base and carry loop.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "insulated-flask",
  license: 'CC0-1.0',
  title: "Insulated mountain flask",
  description: "Double-wall flask with a shoulder, screw cap, protective base and carry loop. Knobs: overall scale plus stainlessSteel, polymer and silicone material colors.",
  tags: ["alpine expedition", "mountaineering", "insulated mountain flask", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#c0c7c7', { label: 'Stainless steel' });
const polymer = param('polymer', '#53676b', { label: 'Engineering polymer' });
const silicone = param('silicone', '#465860', { label: 'Silicone' });

presets({
  stormWorn: { stainlessSteel: '#969b9b', polymer: '#415053', silicone: '#37454b' },
  highVisibility: { polymer: '#e79135', stainlessSteel: '#c0c7c7' },
});
const baseZ = 0;
const p = assembly("insulated-flask");
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);
const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {
  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);
  if (axis === 'x') part = part.rotateY(90);
  if (axis === 'y') part = part.rotateX(90);
  return part.translate(x, y, z - baseZ).scale(scale);
};

p.part("flask-body", c(0, 0, 0, 360, 92, 12).color(stainlessSteel));
p.part("neck", c(0, 0, 355, 75, 58, 10).color(stainlessSteel));
p.part("screw-cap", c(0, 0, 420, 84, 68, 10).color(polymer));
p.part("base-guard", c(0, 0, 0, 48, 98, 10).color(silicone));
p.part("carry-loop", ring(95, 0, 450, 28, 48, 14, 8, "y").color(polymer));

return p.model();
