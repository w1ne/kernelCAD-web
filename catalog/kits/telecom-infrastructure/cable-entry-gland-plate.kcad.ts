// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "cable-entry-gland-plate",
  license: 'CC0-1.0',
  title: "Cable entry gland plate",
  description: "Rectangular entry plate with four raised cable glands and corner bolt heads. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6c7273", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("cable-entry-gland-plate");
p.part("plate", b(0, 0, 0, 680, 420, 50).color(color));
p.part("gland-0", c(-230, 0, 25, 120, 48, 8).color(color));
p.part("gland-1", c(-80, 0, 25, 120, 48, 8).color(color));
p.part("gland-2", c(70, 0, 25, 120, 48, 8).color(color));
p.part("gland-3", c(220, 0, 25, 120, 48, 8).color(color));
p.part("bolt--290--160", c(-290, -160, 25, 18, 16, 8).color(color));
p.part("bolt--290-160", c(-290, 160, 25, 18, 16, 8).color(color));
p.part("bolt-290--160", c(290, -160, 25, 18, 16, 8).color(color));
p.part("bolt-290-160", c(290, 160, 25, 18, 16, 8).color(color));

return p.model();
