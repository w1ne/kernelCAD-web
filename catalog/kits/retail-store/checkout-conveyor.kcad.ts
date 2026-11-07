// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "checkout-conveyor",
  license: 'CC0-1.0',
  title: "Checkout conveyor lane",
  description: "Short checkout belt with side rails, cashier end, scanner deck and a bagging platform. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#46545e", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("checkout-conveyor");
p.part("belt-base", b(0, 0, 310, 1500, 550, 620).color(color));
p.part("belt-surface", b(-180, 0, 625, 1000, 470, 30).color(color));
p.part("rail-left", b(-180, -244, 674, 1040, 24, 70).color(color));
p.part("rail-right", b(-180, 244, 674, 1040, 24, 70).color(color));
p.part("cashier-end", b(510, 0, 420, 380, 600, 840).color(color));
p.part("bagging-deck", b(910, 0, 410, 440, 620, 820).color(color));
p.part("scanner", c(270, 0, 650, 25, 50, 8).color(color));

return p.model();
