// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "fiber-drop-terminal",
  license: 'CC0-1.0',
  title: "Fiber drop terminal",
  description: "Small multiport drop terminal with six connector caps and a shallow rain hood. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8b927e", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("fiber-drop-terminal");
p.part("case", b(0, 0, 72, 430, 180, 220).color(color));
p.part("hood", b(0, 0, 207, 470, 220, 45).color(color));
p.part("face", b(0, -96, 92, 370, 14, 150).color(color));
p.part("port-0", c(-135, -110, 0, 45, 18, 8).color(color));
p.part("port-1", c(-81, -110, 0, 45, 18, 8).color(color));
p.part("port-2", c(-27, -110, 0, 45, 18, 8).color(color));
p.part("port-3", c(27, -110, 0, 45, 18, 8).color(color));
p.part("port-4", c(81, -110, 0, 45, 18, 8).color(color));
p.part("port-5", c(135, -110, 0, 45, 18, 8).color(color));

return p.model();
