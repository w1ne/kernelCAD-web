// SPDX-License-Identifier: CC0-1.0
// Compact self-checkout pedestal with tilted display housing, scanner deck, bag hook and payment shelf

meta({
  name: "self-checkout-kiosk",
  license: 'CC0-1.0',
  title: "Self-checkout kiosk",
  description: "Compact self-checkout pedestal with tilted display housing, scanner deck, bag hook and payment shelf. Knobs: overall scale and abs plastic, glass, stainless steel color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const abs = param('abs', '#536a73', { label: 'ABS plastic color' });
const glass = param('glass', '#7fc5d0', { label: 'Glass color' });
const stainless = param('stainless', '#aeb7b8', { label: 'Stainless steel color' });

presets({
  cleanStore: {
    abs: '#e5e9e9',
    glass: '#9ccfd6',
    stainless: '#bfc8cb',
  },
  nightRestock: {
    abs: '#364a55',
    glass: '#3e6677',
    stainless: '#66747a',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const tiltedB = (x: number, y: number, z: number, w: number, d: number, h: number, angle: number) => box(w, d, h, true).rotateX(angle).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("self-checkout-kiosk");
p.part("foot", b(0, 0, 30, 570, 500, 60).color(abs));
p.part("pedestal", b(0, 0, 360, 250, 220, 660).color(abs));
p.part("scanner-deck", b(0, -140, 725, 510, 330, 70).color(abs));
p.part("display", tiltedB(0, 40, 900, 500, 100, 300, -10).color(abs));
p.part("screen", tiltedB(0, -18, 910, 390, 18, 205, -10).color(glass));
p.part("scanner-window", c(0, -160, 765, 12, 72, 8).color(glass));
p.part("bag-hook", b(235, 105, 490, 170, 26, 24).color(stainless));

return p.model();
