// SPDX-License-Identifier: CC0-1.0
// Open-top bulk dispenser with tapered-look stand, front scoop tray and a shallow lid lip

meta({
  name: "bulk-food-bin",
  license: 'CC0-1.0',
  title: "Bulk goods bin",
  description: "Open-top bulk dispenser with tapered-look stand, front scoop tray and a shallow lid lip. Knobs: overall scale and timber, acrylic, stainless steel color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#877355', { label: 'Timber color' });
const acrylic = param('acrylic', '#b5d4ce', { label: 'Acrylic color' });
const stainless = param('stainless', '#a9b1b2', { label: 'Stainless steel color' });

presets({
  cleanStore: {
    timber: '#b9915c',
    acrylic: '#a1d1dc',
    stainless: '#bfc8cb',
  },
  nightRestock: {
    timber: '#6e5133',
    acrylic: '#486b80',
    stainless: '#66747a',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("bulk-food-bin");
p.part("base", b(0, 0, 420, 560, 560, 840).color(timber));
p.part("hopper", b(0, 0, 910, 650, 650, 260).color(acrylic));
p.part("top-rim", b(0, 0, 1050, 720, 720, 40).color(stainless));
p.part("scoop-tray", b(0, -360, 310, 390, 130, 120).color(stainless));
p.part("scoop-lip", b(0, -430, 365, 400, 24, 26).color(stainless));
p.part("dispense-knob", c(0, -310, 560, 65, 28, 8).color(stainless));

return p.model();
