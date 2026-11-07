// SPDX-License-Identifier: CC0-1.0
// Lidded chest freezer with raised sliding cover rails, insulated tub and recessed foot plinth

meta({
  name: "chest-freezer",
  license: 'CC0-1.0',
  title: "Chest freezer",
  description: "Lidded chest freezer with raised sliding cover rails, insulated tub and recessed foot plinth. Knobs: overall scale and powder-coated steel, stainless steel, abs plastic color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#cbd5d5', { label: 'Powder-coated steel color' });
const stainless = param('stainless', '#8b999d', { label: 'Stainless steel color' });
const abs = param('abs', '#4d6975', { label: 'ABS plastic color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    stainless: '#bfc8cb',
    abs: '#e5e9e9',
  },
  nightRestock: {
    powderCoat: '#354750',
    stainless: '#66747a',
    abs: '#364a55',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("chest-freezer");
p.part("plinth", b(0, 0, 80, 1480, 760, 160).color(powderCoat));
p.part("tub", b(0, 0, 400, 1400, 680, 640).color(powderCoat));
p.part("lid-left", b(-340, 0, 750, 720, 700, 60).color(stainless));
p.part("lid-right", b(340, 0, 750, 720, 700, 60).color(stainless));
p.part("handle", b(0, -365, 735, 260, 24, 30).color(stainless));
p.part("thermostat", c(560, -355, 705, 32, 32, 8).color(abs));

return p.model();
