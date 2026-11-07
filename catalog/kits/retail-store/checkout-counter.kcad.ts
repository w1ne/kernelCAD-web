// SPDX-License-Identifier: CC0-1.0
// Checkout fixture with a customer ledge, separate bagging wing, colored fascia, and cashier display.

meta({
  name: "checkout-counter",
  license: 'CC0-1.0',
  title: "Checkout counter",
  description: "Retail checkout counter with customer ledge, cashier worktop, front kick panel and bagging return. Knobs: overall scale and powder-coated steel, laminate, glass color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#4c616d', { label: 'Powder-coated steel color' });
const laminate = param('laminate', '#c1a77e', { label: 'Laminate color' });
const glass = param('glass', '#83c8d2', { label: 'Glass color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    laminate: '#d5c3a5',
    glass: '#9ccfd6',
  },
  nightRestock: {
    powderCoat: '#354750',
    laminate: '#685744',
    glass: '#3e6677',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("checkout-counter");
p.part("base", b(0, 0, 240, 1500, 700, 480).color(powderCoat));
p.part("customer-ledge", b(-40, -390, 510, 1700, 180, 40).color(laminate));
p.part("worktop", b(30, 0, 500, 1350, 640, 60).color(laminate));
p.part("bagging-return", b(1040, 0, 475, 360, 690, 70).color(laminate));
p.part("scanner-window", c(520, -180, 530, 18, 90, 8).color(glass));
p.part("front-fascia", b(-40, -356, 265, 1340, 14, 350).color(laminate));
p.part("fascia-end-left", b(-710, -366, 265, 24, 18, 350).color(powderCoat));
p.part("fascia-end-right", b(630, -366, 265, 24, 18, 350).color(powderCoat));
p.part("toe-kick", b(-40, -365, 48, 1340, 18, 88).color(powderCoat));
p.part("cashier-display-post", b(-450, 190, 590, 44, 50, 140).color(powderCoat));
p.part("cashier-display", b(-450, 177, 720, 270, 44, 180).color(powderCoat));
p.part("cashier-screen", b(-450, 151, 720, 226, 12, 132).color(glass));
p.part("cash-drawer", b(-450, 230, 445, 390, 270, 70).color(powderCoat));

return p.model();
