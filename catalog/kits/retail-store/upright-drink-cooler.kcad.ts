// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "upright-drink-cooler",
  license: 'CC0-1.0',
  title: "Upright drink cooler",
  description: "Tall single-door beverage cooler with framed door, handle, compressor plinth and top header. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#536d78", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("upright-drink-cooler");
p.part("cabinet", b(0, 0, 950, 780, 700, 1900).color(color));
p.part("door-frame", b(0, -365, 1120, 710, 22, 1460).color(color));
p.part("door-window", b(0, -382, 1120, 590, 12, 1280).color(color));
p.part("handle", b(300, -410, 1120, 34, 36, 530).color(color));
p.part("inner-shelf-0", b(0, -280, 540, 570, 510, 28).color(color));
p.part("inner-shelf-1", b(0, -280, 860, 570, 510, 28).color(color));
p.part("inner-shelf-2", b(0, -280, 1180, 570, 510, 28).color(color));
p.part("inner-shelf-3", b(0, -280, 1500, 570, 510, 28).color(color));
p.part("top-header", b(0, -40, 1950, 780, 620, 100).color(color));
p.part("compressor-grille", c(0, 0, 0, 65, 260, 8).color(color));

return p.model();
