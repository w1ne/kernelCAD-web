// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "pole-mount-radio-cabinet",
  license: 'CC0-1.0',
  title: "Pole mount radio cabinet",
  description: "Compact pole-mounted radio enclosure with strap brackets, lid and front service panel. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d7b82", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("pole-mount-radio-cabinet");
p.part("box", b(0, 0, 0, 540, 360, 780).color(color));
p.part("lid", b(0, 0, 420, 580, 400, 60).color(color));
p.part("panel", b(0, -190, 10, 420, 18, 580).color(color));
p.part("strap-upper", b(0, 210, 260, 620, 46, 60).color(color));
p.part("strap-lower", b(0, 210, 90, 620, 46, 60).color(color));
p.part("lock", c(160, -214, 220, 24, 16, 8).color(color));

return p.model();
