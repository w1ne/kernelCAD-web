// SPDX-License-Identifier: CC0-1.0
// Handheld payment pin pad with angled display, keypad block, contactless area and stand

meta({
  name: "payment-terminal",
  license: 'CC0-1.0',
  title: "Payment terminal",
  description: "Handheld payment pin pad with angled display, keypad block, contactless area and stand. Knobs: overall scale and abs plastic, glass, rubber color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const abs = param('abs', '#364751', { label: 'ABS plastic color' });
const glass = param('glass', '#79c3ce', { label: 'Glass color' });
const rubber = param('rubber', '#343638', { label: 'Rubber color' });

presets({
  cleanStore: {
    abs: '#e5e9e9',
    glass: '#9ccfd6',
    rubber: '#40474b',
  },
  nightRestock: {
    abs: '#364a55',
    glass: '#3e6677',
    rubber: '#262b2e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const tiltedB = (x: number, y: number, z: number, w: number, d: number, h: number, angle: number) => box(w, d, h, true).rotateX(angle).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("payment-terminal");
p.part("base", b(0, 0, 25, 210, 190, 50).color(abs));
p.part("housing", tiltedB(0, 0, 105, 180, 155, 150, -9).color(abs));
p.part("screen", tiltedB(0, -82, 160, 132, 12, 65, -9).color(glass));
p.part("keypad", b(0, 36, 166, 126, 75, 40).color(rubber));
p.part("contactless-mark", c(0, -6, 165, 10, 24, 8).color(glass));

return p.model();
