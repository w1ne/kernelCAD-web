// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "fiber-dome-closure",
  license: 'CC0-1.0',
  title: "Fiber dome closure",
  description: "Vertical dome splice enclosure with a domed-looking cap, lower collar and four cable ports. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#68785d", { label: 'Asset color' });
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("fiber-dome-closure");
p.part("base", c(0, 0, 0, 90, 170, 8).color(color));
p.part("body", c(0, 0, 90, 560, 140, 8).color(color));
p.part("dome", c(0, 0, 650, 140, 155, 8).color(color));
p.part("port-a", c(-105, -105, 20, 80, 42, 8).color(color));
p.part("port-b", c(105, -105, 20, 80, 42, 8).color(color));
p.part("port-c", c(-105, 105, 20, 80, 42, 8).color(color));
p.part("port-d", c(105, 105, 20, 80, 42, 8).color(color));

return p.model();
