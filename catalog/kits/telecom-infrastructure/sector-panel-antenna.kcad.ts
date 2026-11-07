// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "sector-panel-antenna",
  license: 'CC0-1.0',
  title: "Sector panel antenna",
  description: "Slim panel antenna with shallow radome, rear mounting rail and connector block. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#e2e4dc", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("sector-panel-antenna");
p.part("radome", b(0, 0, 620, 260, 130, 1240).color(color));
p.part("top-cap", b(0, 0, 1260, 270, 145, 40).color(color));
p.part("bottom-cap", b(0, 0, 0, 270, 145, 40).color(color));
p.part("rear-rail", b(0, 78, 600, 55, 44, 1120).color(color));
p.part("connector", b(0, 110, 80, 150, 75, 90).color(color));

return p.model();
