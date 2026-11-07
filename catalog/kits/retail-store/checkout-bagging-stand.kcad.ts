// SPDX-License-Identifier: CC0-1.0
// Freestanding bagging station with broad work surface, four legs and lower storage brace

meta({
  name: "checkout-bagging-stand",
  license: 'CC0-1.0',
  title: "Bagging stand",
  description: "Freestanding bagging station with broad work surface, four legs and lower storage brace. Knobs: overall scale and stainless steel, laminate, polypropylene color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', '#879397', { label: 'Stainless steel color' });
const laminate = param('laminate', '#b99b70', { label: 'Laminate color' });
const polypropylene = param('polypropylene', '#4e6861', { label: 'Polypropylene color' });

presets({
  cleanStore: {
    stainless: '#bfc8cb',
    laminate: '#d5c3a5',
    polypropylene: '#d6e0d5',
  },
  nightRestock: {
    stainless: '#66747a',
    laminate: '#685744',
    polypropylene: '#45614e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("checkout-bagging-stand");
p.part("top", b(0, 0, 780, 850, 620, 70).color(laminate));
p.part("lower-brace", b(0, 0, 310, 570, 480, 36).color(stainless));
p.part("leg--370--245", b(-370, -245, 390, 48, 48, 780).color(stainless));
p.part("leg--370-245", b(-370, 245, 390, 48, 48, 780).color(stainless));
p.part("leg-370--245", b(370, -245, 390, 48, 48, 780).color(stainless));
p.part("leg-370-245", b(370, 245, 390, 48, 48, 780).color(stainless));
p.part("bag-holder", c(0, 0, 815, 50, 58, 10).color(polypropylene));

return p.model();
