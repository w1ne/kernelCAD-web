// SPDX-License-Identifier: CC0-1.0
// Bottle return fixture with tapered-looking intake hood, bin body, status panel and service door

meta({
  name: "bottle-return-kiosk",
  license: 'CC0-1.0',
  title: "Bottle return kiosk",
  description: "Bottle return fixture with tapered-looking intake hood, bin body, status panel and service door. Knobs: overall scale and powder-coated steel, stainless steel, polycarbonate color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#4e665d', { label: 'Powder-coated steel color' });
const stainless = param('stainless', '#aab4b5', { label: 'Stainless steel color' });
const polycarbonate = param('polycarbonate', '#8bc9b0', { label: 'Polycarbonate color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    stainless: '#bfc8cb',
    polycarbonate: '#a2d1d7',
  },
  nightRestock: {
    powderCoat: '#354750',
    stainless: '#66747a',
    polycarbonate: '#486b7b',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("bottle-return-kiosk");
p.part("bin", b(0, 0, 540, 920, 760, 1080).color(powderCoat));
p.part("intake-hood", b(0, -270, 1200, 720, 260, 220).color(polycarbonate));
p.part("opening", b(0, -410, 1180, 430, 20, 115).color(powderCoat));
p.part("control-panel", b(305, -395, 980, 170, 24, 310).color(polycarbonate));
p.part("service-door", b(-240, -390, 480, 380, 22, 600).color(stainless));
p.part("status-light", c(305, -425, 1100, 28, 22, 8).color(polycarbonate));

return p.model();
