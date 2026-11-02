// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "price-check-scale",
  license: 'CC0-1.0',
  title: "Price-check scale",
  description: "Countertop produce scale with broad platform, raised readout head and four-key control pad. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6f777b", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("price-check-scale");
p.part("base", b(0, 0, 42, 380, 340, 84).color(color));
p.part("weigh-platform", b(0, 0, 105, 330, 290, 42).color(color));
p.part("post", b(0, 80, 265, 56, 46, 310).color(color));
p.part("display", b(0, 90, 445, 290, 60, 155).color(color));
p.part("screen", b(0, 55, 455, 225, 12, 72).color(color));
p.part("key-0", c(-66, -110, 148, 18, 14, 8).color(color));
p.part("key-1", c(-22, -110, 148, 18, 14, 8).color(color));
p.part("key-2", c(22, -110, 148, 18, 14, 8).color(color));
p.part("key-3", c(66, -110, 148, 18, 14, 8).color(color));

return p.model();
