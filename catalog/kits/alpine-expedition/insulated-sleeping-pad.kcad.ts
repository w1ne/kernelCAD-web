// SPDX-License-Identifier: CC0-1.0
// Insulated sleeping pad: Low-profile inflatable pad with raised side rails and repeated transverse baffles.
// Model units: millimetres, Z up; the base sits at z = 0.

meta({
  name: "insulated-sleeping-pad",
  license: 'CC0-1.0',
  title: "Insulated sleeping pad",
  description: "Low-profile inflatable pad with raised side rails and repeated transverse baffles. Knobs: overall scale plus nylon, foam and silicone material colors.",
  tags: ["alpine expedition", "mountaineering", "insulated sleeping pad", "low poly", "scene prop", "CC0"],
  kit: 'alpine-expedition',
  category: 'prop',
  origin: 'base',
  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const nylon = param('nylon', '#4c7063', { label: 'Nylon fabric' });
const foam = param('foam', '#d1c1a3', { label: 'Foam' });
const silicone = param('silicone', '#465860', { label: 'Silicone' });

presets({
  stormWorn: { nylon: '#3b574d', foam: '#a3977f', silicone: '#37454b' },
  highVisibility: { nylon: '#e79135' },
});
const baseZ = 0.0;
const p = assembly("insulated-sleeping-pad");
const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {
  let part = box(w, d, h, true);
  if (rx) part = part.rotateX(rx);
  if (ry) part = part.rotateY(ry);
  if (rz) part = part.rotateZ(rz);
  return part.translate(x, y, z + h / 2 - baseZ).scale(scale);
};
const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale);

p.part("pad-body", b(0, 0, 0, 820, 1980, 95, 0, 0, 0).color(foam));
p.part("baffle-0", b(0, -850, 92, 760, 34, 35, 0, 0, 0).color(nylon));
p.part("baffle-1", b(0, -630, 92, 760, 34, 35, 0, 0, 0).color(nylon));
p.part("baffle-2", b(0, -410, 92, 760, 34, 35, 0, 0, 0).color(nylon));
p.part("baffle-3", b(0, -190, 92, 760, 34, 35, 0, 0, 0).color(nylon));
p.part("baffle-4", b(0, 30, 92, 760, 34, 35, 0, 0, 0).color(nylon));
p.part("baffle-5", b(0, 250, 92, 760, 34, 35, 0, 0, 0).color(nylon));
p.part("baffle-6", b(0, 470, 92, 760, 34, 35, 0, 0, 0).color(nylon));
p.part("baffle-7", b(0, 690, 92, 760, 34, 35, 0, 0, 0).color(nylon));
p.part("head-pillow-zone", b(0, -820, 96, 770, 280, 26, 0, 0, 0).color(nylon));
p.part("inflation-valve", c(330, 840, 72, 60, 38, 8).color(silicone));

return p.model();
