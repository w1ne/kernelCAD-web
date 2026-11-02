// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "handbasket",
  license: 'CC0-1.0',
  title: "Hand basket",
  description: "Compact hand basket with open-frame sides, reinforced rim and raised swing handle. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d18c42", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("handbasket");
p.part("basket-base", b(0, 0, 40, 460, 320, 80).color(color));
p.part("rim", b(0, 0, 330, 500, 360, 48).color(color));
p.part("side-rib-x-0", b(-210, 0, 190, 16, 300, 280).color(color));
p.part("side-rib-x-1", b(-140, 0, 190, 16, 300, 280).color(color));
p.part("side-rib-x-2", b(-70, 0, 190, 16, 300, 280).color(color));
p.part("side-rib-x-3", b(0, 0, 190, 16, 300, 280).color(color));
p.part("side-rib-x-4", b(70, 0, 190, 16, 300, 280).color(color));
p.part("side-rib-x-5", b(140, 0, 190, 16, 300, 280).color(color));
p.part("side-rib-x-6", b(210, 0, 190, 16, 300, 280).color(color));
p.part("side-rib-y-0", b(0, -140, 190, 440, 16, 280).color(color));
p.part("side-rib-y-1", b(0, -70, 190, 440, 16, 280).color(color));
p.part("side-rib-y-2", b(0, 0, 190, 440, 16, 280).color(color));
p.part("side-rib-y-3", b(0, 70, 190, 440, 16, 280).color(color));
p.part("side-rib-y-4", b(0, 140, 190, 440, 16, 280).color(color));
p.part("handle-side--220", b(-220, 0, 470, 20, 22, 280).color(color));
p.part("handle-side-220", b(220, 0, 470, 20, 22, 280).color(color));
p.part("handle-grip", b(0, 0, 610, 450, 28, 26).color(color));
p.part("pivot-cap", c(-220, 0, 325, 22, 22, 8).color(color));

return p.model();
