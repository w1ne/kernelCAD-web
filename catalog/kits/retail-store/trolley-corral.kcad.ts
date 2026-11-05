// SPDX-License-Identifier: CC0-1.0
// Low cart-return bay with parallel divider rails, end stop and corner guard posts

meta({
  name: "trolley-corral",
  license: 'CC0-1.0',
  title: "Trolley corral",
  description: "Low cart-return bay with parallel divider rails, end stop and corner guard posts. Knobs: overall scale and galvanized steel, powder-coated steel, rubber color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const galvanizedSteel = param('galvanizedSteel', '#778488', { label: 'Galvanized steel color' });
const powderCoat = param('powderCoat', '#d8a53b', { label: 'Powder-coated steel color' });
const rubber = param('rubber', '#343a3c', { label: 'Rubber color' });

presets({
  cleanStore: {
    galvanizedSteel: '#afbabb',
    powderCoat: '#e5ebed',
    rubber: '#40474b',
  },
  nightRestock: {
    galvanizedSteel: '#566468',
    powderCoat: '#354750',
    rubber: '#262b2e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("trolley-corral");
p.part("floor-rail-left", b(0, -330, 24, 1800, 35, 48).color(galvanizedSteel));
p.part("floor-rail-right", b(0, 330, 24, 1800, 35, 48).color(galvanizedSteel));
p.part("end-stop", b(850, 0, 240, 50, 690, 480).color(rubber));
p.part("front-gate", b(-850, 0, 330, 38, 690, 660).color(powderCoat));
p.part("divider-0", b(-600, 0, 145, 26, 620, 290).color(galvanizedSteel));
p.part("divider-1", b(-300, 0, 145, 26, 620, 290).color(galvanizedSteel));
p.part("divider-2", b(0, 0, 145, 26, 620, 290).color(galvanizedSteel));
p.part("divider-3", b(300, 0, 145, 26, 620, 290).color(galvanizedSteel));
p.part("divider-4", b(600, 0, 145, 26, 620, 290).color(galvanizedSteel));
p.part("post-cap--850", c(-850, 0, 660, 32, 32, 8).color(powderCoat));
p.part("post-cap-850", c(850, 0, 660, 32, 32, 8).color(powderCoat));

return p.model();
