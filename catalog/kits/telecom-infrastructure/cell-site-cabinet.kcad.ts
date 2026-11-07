// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "cell-site-cabinet",
  license: 'CC0-1.0',
  title: "Cell site cabinet",
  description: "Outdoor base-station cabinet with raised roof, split access doors, plinth and vent banks. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#71818a", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("cell-site-cabinet");
p.part("cabinet", b(0, 0, 60, 900, 620, 1450).color(color));
p.part("roof", b(0, 0, 1510, 960, 680, 70).color(color));
p.part("left-door", b(-220, -318, 90, 420, 18, 1180).color(color));
p.part("right-door", b(220, -318, 90, 420, 18, 1180).color(color));
p.part("vent-1", b(0, -331, 300, 180, 16, 80).color(color));
p.part("vent-2", b(0, -331, 450, 180, 16, 80).color(color));
p.part("plinth", b(0, 0, 0, 940, 660, 60).color(color));

return p.model();
