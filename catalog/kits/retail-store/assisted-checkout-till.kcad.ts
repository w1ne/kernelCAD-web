// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "assisted-checkout-till",
  license: 'CC0-1.0',
  title: "Assisted checkout till",
  description: "Cashier station with a register housing, customer-facing display, receipt printer and till top. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#596776", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("assisted-checkout-till");
p.part("register-base", b(0, 0, 45, 500, 350, 90).color(color));
p.part("register-body", b(0, 0, 190, 410, 280, 300).color(color));
p.part("keypad-deck", b(-40, -70, 365, 260, 170, 45).color(color));
p.part("customer-display", b(60, 110, 465, 240, 40, 130).color(color));
p.part("display-screen", b(60, 84, 470, 190, 12, 90).color(color));
p.part("receipt-roll", c(-150, 50, 345, 70, 35, 10).color(color));

return p.model();
