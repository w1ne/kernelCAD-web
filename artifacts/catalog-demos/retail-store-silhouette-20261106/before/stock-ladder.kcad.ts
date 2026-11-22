// SPDX-License-Identifier: CC0-1.0
// Compact rolling stock ladder with three broad treads, side rails, top platform and caster feet

meta({
  name: "stock-ladder",
  license: 'CC0-1.0',
  title: "Stock ladder",
  description: "Compact rolling stock ladder with three broad treads, side rails, top platform and caster feet. Knobs: overall scale and aluminium, rubber, powder-coated steel color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const aluminium = param('aluminium', '#c2cbcc', { label: 'Aluminium color' });
const rubber = param('rubber', '#2e3336', { label: 'Rubber color' });
const powderCoat = param('powderCoat', '#d9a02d', { label: 'Powder-coated steel color' });

presets({
  cleanStore: {
    aluminium: '#c4cdd0',
    rubber: '#40474b',
    powderCoat: '#e5ebed',
  },
  nightRestock: {
    aluminium: '#6b7a80',
    rubber: '#262b2e',
    powderCoat: '#354750',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const cx = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).rotate([0, 1, 0], 90).translate(x - h / 2, y, z).scale(scale);

const p = assembly("stock-ladder");
p.part("top-platform", b(0, 0, 850, 720, 530, 90).color(powderCoat));
p.part("tread-0", b(0, -190, 210, 650, 180, 54).color(powderCoat));
p.part("tread-1", b(0, -100, 415, 650, 180, 54).color(powderCoat));
p.part("tread-2", b(0, -10, 620, 650, 180, 54).color(powderCoat));
p.part("rail--300", b(-300, 0, 460, 52, 60, 920).color(aluminium));
p.part("rail-300", b(300, 0, 460, 52, 60, 920).color(aluminium));
p.part("caster--280", cx(-280, 0, 44, 64, 44, 8).color(rubber));
p.part("caster-280", cx(280, 0, 44, 64, 44, 8).color(rubber));

return p.model();
