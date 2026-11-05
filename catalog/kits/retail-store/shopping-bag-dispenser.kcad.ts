// SPDX-License-Identifier: CC0-1.0
// Wall-mounted bag dispenser with cover hood, stack cavity and lower pull slot

meta({
  name: "shopping-bag-dispenser",
  license: 'CC0-1.0',
  title: "Shopping bag dispenser",
  description: "Wall-mounted bag dispenser with cover hood, stack cavity and lower pull slot. Knobs: overall scale and powder-coated steel, polypropylene, stainless steel color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#64736f', { label: 'Powder-coated steel color' });
const polypropylene = param('polypropylene', '#e2d7bb', { label: 'Polypropylene color' });
const stainless = param('stainless', '#9da8aa', { label: 'Stainless steel color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    polypropylene: '#d6e0d5',
    stainless: '#bfc8cb',
  },
  nightRestock: {
    powderCoat: '#354750',
    polypropylene: '#45614e',
    stainless: '#66747a',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("shopping-bag-dispenser");
p.part("backplate", b(0, 30, 390, 470, 75, 780).color(powderCoat));
p.part("hood", b(0, -70, 730, 520, 210, 100).color(powderCoat));
p.part("bag-stack", b(0, -160, 420, 360, 20, 540).color(polypropylene));
p.part("pull-slot", b(0, -180, 130, 260, 20, 50).color(powderCoat));
p.part("mount-left", c(-170, 85, 680, 28, 24, 8).color(stainless));
p.part("mount-right", c(170, 85, 680, 28, 24, 8).color(stainless));

return p.model();
