// SPDX-License-Identifier: CC0-1.0
// Cashier station with a register housing, customer-facing display, receipt printer and till top

meta({
  name: "assisted-checkout-till",
  license: 'CC0-1.0',
  title: "Assisted checkout till",
  description: "Cashier station with a register housing, customer-facing display, receipt printer and till top. Knobs: overall scale and abs plastic, glass, paper color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const abs = param('abs', '#56656d', { label: 'ABS plastic color' });
const glass = param('glass', '#8dc8d2', { label: 'Glass color' });
const paper = param('paper', '#f0e3c3', { label: 'Paper color' });

presets({
  cleanStore: {
    abs: '#e5e9e9',
    glass: '#9ccfd6',
    paper: '#f0e5c9',
  },
  nightRestock: {
    abs: '#364a55',
    glass: '#3e6677',
    paper: '#c9b27e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("assisted-checkout-till");
p.part("register-base", b(0, 0, 45, 500, 350, 90).color(abs));
p.part("register-body", b(0, 0, 190, 410, 280, 300).color(abs));
p.part("keypad-deck", b(-40, -70, 365, 260, 170, 45).color(abs));
p.part("customer-display", b(60, 110, 465, 240, 40, 130).color(abs));
p.part("display-screen", b(60, 84, 470, 190, 12, 90).color(glass));
p.part("receipt-roll", c(-150, 50, 345, 70, 35, 10).color(paper));

return p.model();
