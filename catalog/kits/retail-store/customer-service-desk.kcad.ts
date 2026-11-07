// SPDX-License-Identifier: CC0-1.0
// Store service counter with lowered accessible return ledge, raised worktop and back display panel

meta({
  name: "customer-service-desk",
  license: 'CC0-1.0',
  title: "Customer service desk",
  description: "Store service counter with lowered accessible return ledge, raised worktop and back display panel. Knobs: overall scale and laminate, powder-coated steel, glass, polycarbonate color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const laminate = param('laminate', '#87745d', { label: 'Laminate color' });
const powderCoat = param('powderCoat', '#59666d', { label: 'Powder-coated steel color' });
const glass = param('glass', '#86c6d0', { label: 'Glass color' });
const polycarbonate = param('polycarbonate', '#dd9c37', { label: 'Polycarbonate color' });

presets({
  cleanStore: {
    laminate: '#d5c3a5',
    powderCoat: '#e5ebed',
    glass: '#9ccfd6',
    polycarbonate: '#a2d1d7',
  },
  nightRestock: {
    laminate: '#685744',
    powderCoat: '#354750',
    glass: '#3e6677',
    polycarbonate: '#486b7b',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("customer-service-desk");
p.part("main-counter", b(0, 80, 470, 1900, 620, 940).color(laminate));
p.part("customer-ledge", b(0, -320, 500, 1950, 160, 60).color(laminate));
p.part("accessible-return", b(600, 180, 390, 650, 650, 780).color(laminate));
p.part("back-display", b(0, 350, 1240, 1850, 70, 520).color(powderCoat));
p.part("screen", b(300, 300, 1570, 360, 35, 280).color(glass));
p.part("call-button", c(-720, -420, 540, 22, 26, 8).color(polycarbonate));

return p.model();
