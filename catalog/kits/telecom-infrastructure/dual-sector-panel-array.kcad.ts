// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "dual-sector-panel-array",
  license: 'CC0-1.0',
  title: "Dual sector panel array",
  description: "Pair of side-by-side sector panels on a shared rear rail with clamp brackets. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d9ddd7", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("dual-sector-panel-array");
p.part("panel-left", b(-180, 0, 520, 280, 120, 1200).color(color));
p.part("panel-right", b(180, 0, 520, 280, 120, 1200).color(color));
p.part("back-rail", b(0, 75, 520, 44, 50, 1320).color(color));
p.part("clamp-upper", b(0, 220, 850, 400, 42, 60).color(color));
p.part("clamp-lower", b(0, 220, 250, 400, 42, 60).color(color));
p.part("connector-left", b(-180, -68, 0, 80, 25, 90).color(color));
p.part("connector-right", b(180, -68, 0, 80, 25, 90).color(color));

return p.model();
