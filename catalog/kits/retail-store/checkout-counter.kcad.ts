// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "checkout-counter",
  license: 'CC0-1.0',
  title: "Checkout counter",
  description: "Retail checkout counter with customer ledge, cashier worktop, front kick panel and bagging return. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#53697a", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("checkout-counter");
p.part("base", b(0, 0, 240, 1500, 700, 480).color(color));
p.part("customer-ledge", b(-40, -390, 510, 1700, 180, 40).color(color));
p.part("worktop", b(30, 0, 500, 1350, 640, 60).color(color));
p.part("bagging-return", b(1040, 0, 475, 360, 690, 70).color(color));
p.part("scanner-window", c(520, -180, 530, 18, 90, 8).color(color));
p.part("front-panel", b(-40, 356, 265, 1340, 14, 350).color(color));

return p.model();
