// SPDX-License-Identifier: CC0-1.0
// Warehouse-style retail flatbed trolley with deck, raised end handle and four swivel wheels

meta({
  name: "flatbed-stock-trolley",
  license: 'CC0-1.0',
  title: "Flatbed stock trolley",
  description: "Warehouse-style retail flatbed trolley with deck, raised end handle and four swivel wheels. Knobs: overall scale and powder-coated steel, stainless steel, rubber color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#4e5e66', { label: 'Powder-coated steel color' });
const stainless = param('stainless', '#a9b3b5', { label: 'Stainless steel color' });
const rubber = param('rubber', '#292e31', { label: 'Rubber color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    stainless: '#bfc8cb',
    rubber: '#40474b',
  },
  nightRestock: {
    powderCoat: '#354750',
    stainless: '#66747a',
    rubber: '#262b2e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);
const cx = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).rotate([0, 1, 0], 90).translate(x - h / 2, y, z).scale(scale);

const p = assembly("flatbed-stock-trolley");
p.part("deck", b(0, 0, 420, 1100, 700, 70).color(stainless));
p.part("handle-upright", b(0, 310, 760, 60, 55, 680).color(powderCoat));
p.part("handle-grip", b(0, 310, 1100, 430, 52, 54).color(rubber));
p.part("toe-plate", b(0, -330, 365, 1100, 70, 35).color(stainless));
p.part("caster--440--260", cx(-440, -260, 64, 80, 64, 10).color(rubber));
p.part("caster--440-260", cx(-440, 260, 64, 80, 64, 10).color(rubber));
p.part("caster-440--260", cx(440, -260, 64, 80, 64, 10).color(rubber));
p.part("caster-440-260", cx(440, 260, 64, 80, 64, 10).color(rubber));
p.part("caster-mount--440--260", b(-440, -260, 259, 46, 46, 260).color(stainless));
p.part("caster-mount--440-260", b(-440, 260, 259, 46, 46, 260).color(stainless));
p.part("caster-mount-440--260", b(440, -260, 259, 46, 46, 260).color(stainless));
p.part("caster-mount-440-260", b(440, 260, 259, 46, 46, 260).color(stainless));
p.part("corner-bumper--480--280", c(-480, -280, 455, 48, 38, 8).color(rubber));
p.part("corner-bumper--480-280", c(-480, 280, 455, 48, 38, 8).color(rubber));
p.part("corner-bumper-480--280", c(480, -280, 455, 48, 38, 8).color(rubber));
p.part("corner-bumper-480-280", c(480, 280, 455, 48, 38, 8).color(rubber));

return p.model();
