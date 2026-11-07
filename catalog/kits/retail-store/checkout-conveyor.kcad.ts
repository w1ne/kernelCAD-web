// SPDX-License-Identifier: CC0-1.0
// Short checkout belt with side rails, cashier end, scanner deck and a bagging platform

meta({
  name: "checkout-conveyor",
  license: 'CC0-1.0',
  title: "Checkout conveyor lane",
  description: "Short checkout belt with side rails, cashier end, scanner deck and a bagging platform. Knobs: overall scale and powder-coated steel, rubber, glass color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#46545d', { label: 'Powder-coated steel color' });
const rubber = param('rubber', '#252a2d', { label: 'Rubber color' });
const glass = param('glass', '#72b8c5', { label: 'Glass color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    rubber: '#40474b',
    glass: '#9ccfd6',
  },
  nightRestock: {
    powderCoat: '#354750',
    rubber: '#262b2e',
    glass: '#3e6677',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("checkout-conveyor");
p.part("belt-base", b(0, 0, 310, 1500, 550, 620).color(rubber));
p.part("belt-surface", b(-180, 0, 625, 1000, 470, 30).color(rubber));
p.part("rail-left", b(-180, -244, 674, 1040, 24, 70).color(powderCoat));
p.part("rail-right", b(-180, 244, 674, 1040, 24, 70).color(powderCoat));
p.part("cashier-end", b(510, 0, 420, 380, 600, 840).color(powderCoat));
p.part("bagging-deck", b(910, 0, 410, 440, 620, 820).color(powderCoat));
p.part("scanner", c(270, 0, 650, 25, 50, 8).color(glass));

return p.model();
