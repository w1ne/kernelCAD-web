// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "lightning-air-terminal",
  license: 'CC0-1.0',
  title: "Lightning protection air terminal",
  description: "Tapered-looking lightning rod on a broad rooftop base plate with a collar. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#737b80", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("lightning-air-terminal");
p.part("base", b(0, 0, 0, 360, 360, 50).color(color));
p.part("mast", c(0, 0, 25, 850, 35, 8).color(color));
p.part("collar", c(0, 0, 845, 55, 58, 8).color(color));
p.part("tip", c(0, 0, 900, 240, 14, 8).color(color));

return p.model();
