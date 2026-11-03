// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "rooftop-tripod-mast",
  license: 'CC0-1.0',
  title: "Rooftop tripod mast",
  description: "Short rooftop antenna mast on three splayed legs with a round base plate and collar. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#626c70", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("rooftop-tripod-mast");
p.part("base", c(0, 0, 0, 35, 270, 8).color(color));
p.part("mast", c(0, 0, 35, 1300, 42, 8).color(color));
p.part("leg-front", b(0, -90, 25, 36, 180, 780).color(color));
p.part("leg-left", b(-100, 70, 25, 36, 180, 780).color(color));
p.part("leg-right", b(100, 70, 25, 36, 180, 780).color(color));
p.part("collar", c(0, 0, 870, 42, 65, 8).color(color));

return p.model();
