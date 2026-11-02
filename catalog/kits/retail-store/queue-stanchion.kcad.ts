// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "queue-stanchion",
  license: 'CC0-1.0',
  title: "Queue stanchion",
  description: "Single retail queue post with a broad weighted base, slender pole and four-way strap cap. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5a5b58", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("queue-stanchion");
p.part("base", c(0, 0, 0, 55, 175, 12).color(color));
p.part("pole", c(0, 0, 55, 875, 28, 10).color(color));
p.part("top-cap", c(0, 0, 930, 58, 64, 10).color(color));
p.part("strap-slot", b(0, 0, 960, 160, 18, 16).color(color));

return p.model();
