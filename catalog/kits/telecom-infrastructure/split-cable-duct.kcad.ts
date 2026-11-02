// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "split-cable-duct",
  license: 'CC0-1.0',
  title: "Split cable duct",
  description: "Low split-duct cable cover with two channel shells and a bridging lid strip. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8a866e", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("split-cable-duct");
p.part("base-a", b(-145, 0, 0, 260, 480, 50).color(color));
p.part("base-b", b(145, 0, 0, 260, 480, 50).color(color));
p.part("lid-a", b(-145, 0, 55, 260, 480, 45).color(color));
p.part("lid-b", b(145, 0, 55, 260, 480, 45).color(color));
p.part("center-join", b(0, 0, 55, 28, 500, 55).color(color));

return p.model();
