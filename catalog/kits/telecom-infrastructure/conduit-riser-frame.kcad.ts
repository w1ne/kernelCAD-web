// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "conduit-riser-frame",
  license: 'CC0-1.0',
  title: "Conduit riser frame",
  description: "Wall-mounted riser frame with three vertical conduits, stand-off brackets and top bridge. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#707b7e", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("conduit-riser-frame");
p.part("conduit-0", c(-210, 0, 0, 1300, 40, 8).color(color));
p.part("conduit-1", c(0, 0, 0, 1300, 40, 8).color(color));
p.part("conduit-2", c(210, 0, 0, 1300, 40, 8).color(color));
p.part("bridge-top", b(0, 90, 1140, 620, 120, 70).color(color));
p.part("bridge-bottom", b(0, 90, 250, 620, 120, 70).color(color));
p.part("stand-off-a", b(0, 80, 530, 700, 55, 55).color(color));
p.part("stand-off-b", b(0, 80, 950, 700, 55, 55).color(color));

return p.model();
